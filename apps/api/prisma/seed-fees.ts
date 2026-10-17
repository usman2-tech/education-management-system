/**
 * MODULE: Realistic Seed Fixtures for Student Fee Management (TASK 021)
 *
 * PURPOSE:
 * Seeds realistic institutional financial records including fee categories,
 * structures, discounts, assignments, invoices, partial payments, overdue balances,
 * and receipts across existing schools.
 *
 * IDEMPOTENCY:
 * Safe to run multiple times without duplicating or overwriting active institutional records.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Fee Management Seeding (TASK 021) ---');

  const schools = await prisma.school.findMany({
    include: {
      academicYears: { where: { isCurrent: true }, take: 1 },
      users: { where: { role: 'STUDENT' }, take: 8 },
    },
  });

  if (schools.length === 0) {
    console.error('No schools found. Please ensure base database is seeded first.');
    return;
  }

  const primarySchool = schools[0];
  const academicYear = primarySchool.academicYears[0] || (await prisma.academicYear.findFirst({ where: { schoolId: primarySchool.id } }));

  if (!academicYear) {
    console.error('No academic year found for primary school.');
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { schoolId: primarySchool.id, role: 'SCHOOL_ADMIN' },
  }) || (await prisma.user.findFirst({ where: { role: 'PLATFORM_ADMIN' } }));

  if (!admin) {
    console.error('No administrator user found to record payments.');
    return;
  }

  const students = primarySchool.users;
  if (students.length === 0) {
    console.error('No students found in primary school.');
    return;
  }

  console.log(`Seeding fees for school: ${primarySchool.name} (${primarySchool.code})`);

  // 1. Fee Categories (8 Categories)
  const categoryDefs = [
    { name: 'Tuition Fee', code: 'TUIT', isTuition: true, description: 'Core academic instruction and curriculum delivery.' },
    { name: 'Admission Fee', code: 'ADMS', isTuition: false, description: 'One-time registration and institutional matriculation fee.' },
    { name: 'Examination Fee', code: 'EXAM', isTuition: false, description: 'Term assessments, standardized exams, and proctoring.' },
    { name: 'Transportation Fee', code: 'TRAN', isTuition: false, description: 'Campus bus route and commuter transportation.' },
    { name: 'Library Fee', code: 'LIBR', isTuition: false, description: 'Physical and digital library catalog resource access.' },
    { name: 'Laboratory Fee', code: 'LABF', isTuition: false, description: 'Science lab equipment, STEM kits, and consumable chemicals.' },
    { name: 'Activity Fee', code: 'ACTV', isTuition: false, description: 'Extracurricular clubs, cultural events, and campus athletics.' },
    { name: 'Other Custom Fees', code: 'MISC', isTuition: false, description: 'Incidental and institutional specialized service fees.' },
  ];

  const createdCategories: Record<string, any> = {};
  for (const cat of categoryDefs) {
    const record = await prisma.feeCategory.upsert({
      where: {
        schoolId_name: {
          schoolId: primarySchool.id,
          name: cat.name,
        },
      },
      update: { code: cat.code, isTuition: cat.isTuition, description: cat.description },
      create: {
        schoolId: primarySchool.id,
        name: cat.name,
        code: cat.code,
        isTuition: cat.isTuition,
        description: cat.description,
      },
    });
    createdCategories[cat.name] = record;
  }
  console.log(`✔ Seeded ${Object.keys(createdCategories).length} Fee Categories.`);

  // 2. Fee Structures (8 Structures)
  const structureDefs = [
    { name: 'High School Standard Tuition', category: 'Tuition Fee', amount: 4800, gradeLevel: 'Grade 10', frequency: 'ANNUALLY', dueDateDays: 30 },
    { name: 'Middle School Standard Tuition', category: 'Tuition Fee', amount: 3900, gradeLevel: 'Grade 7', frequency: 'ANNUALLY', dueDateDays: 30 },
    { name: 'Institutional Matriculation & Admission', category: 'Admission Fee', amount: 500, gradeLevel: null, frequency: 'ONE_TIME', dueDateDays: 14 },
    { name: 'Annual Midterm & Finals Exam Assessment', category: 'Examination Fee', amount: 350, gradeLevel: null, frequency: 'ANNUALLY', dueDateDays: 45 },
    { name: 'Annual Campus Bus Transit Pass', category: 'Transportation Fee', amount: 850, gradeLevel: null, frequency: 'ANNUALLY', dueDateDays: 30 },
    { name: 'STEM & Science Laboratory Access', category: 'Laboratory Fee', amount: 250, gradeLevel: 'Grade 10', frequency: 'ANNUALLY', dueDateDays: 30 },
    { name: 'Digital Library & Research Database Access', category: 'Library Fee', amount: 120, gradeLevel: null, frequency: 'ANNUALLY', dueDateDays: 30 },
    { name: 'Athletics & Performing Arts Co-Curricular', category: 'Activity Fee', amount: 200, gradeLevel: null, frequency: 'ANNUALLY', dueDateDays: 30 },
  ];

  const createdStructures: any[] = [];
  for (const struct of structureDefs) {
    const category = createdCategories[struct.category];
    const existing = await prisma.feeStructure.findFirst({
      where: { schoolId: primarySchool.id, academicYearId: academicYear.id, name: struct.name },
    });

    if (existing) {
      createdStructures.push(existing);
    } else {
      const created = await prisma.feeStructure.create({
        data: {
          schoolId: primarySchool.id,
          academicYearId: academicYear.id,
          categoryId: category.id,
          name: struct.name,
          gradeLevel: struct.gradeLevel,
          amount: struct.amount,
          currency: 'USD',
          frequency: struct.frequency as any,
          dueDateDays: struct.dueDateDays,
          isActive: true,
        },
      });
      createdStructures.push(created);
    }
  }
  console.log(`✔ Seeded ${createdStructures.length} Fee Structures.`);

  // 3. Fee Discounts (4 Discounts)
  const discountDefs = [
    { name: 'Academic Merit Scholarship', type: 'PERCENTAGE', value: 20, reason: 'Top 5% entrance exam and academic GPA.' },
    { name: 'Sibling Enrolment Concession', type: 'FIXED_AMOUNT', value: 300, reason: 'Second enrolled child in the same academic year.' },
    { name: 'Need-Based Educational Aid', type: 'FIXED_AMOUNT', value: 500, reason: 'Approved institutional grant support.' },
    { name: 'Faculty Dependent Fee Waiver', type: 'PERCENTAGE', value: 50, reason: 'Full-time staff educational benefit.' },
  ];

  const createdDiscounts: any[] = [];
  for (const disc of discountDefs) {
    const existing = await prisma.feeDiscount.findFirst({
      where: { schoolId: primarySchool.id, name: disc.name },
    });

    if (existing) {
      createdDiscounts.push(existing);
    } else {
      const created = await prisma.feeDiscount.create({
        data: {
          schoolId: primarySchool.id,
          name: disc.name,
          type: disc.type as any,
          value: disc.value,
          reason: disc.reason,
          isActive: true,
        },
      });
      createdDiscounts.push(created);
    }
  }
  console.log(`✔ Seeded ${createdDiscounts.length} Fee Discounts.`);

  // 4. Student Fee Assignments (8 Assignments)
  const createdAssignments: any[] = [];
  for (let i = 0; i < Math.min(students.length, 8); i++) {
    const student = students[i];
    const structure = createdStructures[i % createdStructures.length];
    const discount = i % 2 === 1 ? createdDiscounts[i % createdDiscounts.length] : null;

    const existing = await prisma.studentFeeAssignment.findUnique({
      where: {
        studentId_feeStructureId_academicYearId: {
          studentId: student.id,
          feeStructureId: structure.id,
          academicYearId: academicYear.id,
        },
      },
    });

    if (existing) {
      createdAssignments.push(existing);
    } else {
      const created = await prisma.studentFeeAssignment.create({
        data: {
          schoolId: primarySchool.id,
          studentId: student.id,
          academicYearId: academicYear.id,
          feeStructureId: structure.id,
          discountId: discount ? discount.id : null,
          customAmount: null,
          notes: `Assigned for standard academic term.`,
        },
      });
      createdAssignments.push(created);
    }
  }
  console.log(`✔ Seeded ${createdAssignments.length} Student Fee Assignments.`);

  // 5. Invoices & Payments (8 Invoices, 8 Payments)
  // Scenarios:
  // - 3 Fully Paid invoices with receipts
  // - 3 Partially Paid invoices with receipts & balance
  // - 2 Overdue invoices (due in past)
  // - 1 Void invoice

  const invoiceConfigs = [
    { studentIdx: 0, structIdx: 0, status: 'PAID', payMethod: 'BANK_TRANSFER', payAmount: 4800, dueDays: -10 },
    { studentIdx: 1, structIdx: 1, status: 'PAID', payMethod: 'CASH', payAmount: 3120, discountIdx: 0, dueDays: -5 }, // 20% discount on 3900 = 3120
    { studentIdx: 2, structIdx: 2, status: 'PAID', payMethod: 'CHEQUE', payAmount: 500, dueDays: -20 },
    { studentIdx: 3, structIdx: 0, status: 'PARTIALLY_PAID', payMethod: 'BANK_TRANSFER', payAmount: 2400, dueDays: 20 }, // half paid
    { studentIdx: 4, structIdx: 4, status: 'PARTIALLY_PAID', payMethod: 'CASH', payAmount: 400, dueDays: 15 }, // 400 of 850
    { studentIdx: 5, structIdx: 1, status: 'PARTIALLY_PAID', payMethod: 'CHEQUE', payAmount: 1500, dueDays: 25 },
    { studentIdx: 6, structIdx: 3, status: 'OVERDUE', payMethod: null, payAmount: 0, dueDays: -15 }, // overdue unpaid
    { studentIdx: 7, structIdx: 5, status: 'OVERDUE', payMethod: null, payAmount: 0, dueDays: -30 }, // overdue unpaid
  ];

  let receiptCounter = 1;
  let paymentCount = 0;

  for (let i = 0; i < invoiceConfigs.length; i++) {
    const config = invoiceConfigs[i];
    const student = students[config.studentIdx % students.length];
    const structure = createdStructures[config.structIdx % createdStructures.length];
    const discount = config.discountIdx !== undefined ? createdDiscounts[config.discountIdx] : null;

    const subtotal = structure.amount;
    let discountAmount = 0;
    if (discount) {
      discountAmount = discount.type === 'PERCENTAGE' ? (subtotal * discount.value) / 100 : discount.value;
    }
    const totalAmount = Math.max(0, subtotal - discountAmount);

    const invoiceNumber = `INV-2026-${(1000 + i + 1)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + config.dueDays);

    const existingInvoice = await prisma.feeInvoice.findUnique({
      where: { invoiceNumber },
    });

    let invoice = existingInvoice;
    if (!invoice) {
      invoice = await prisma.feeInvoice.create({
        data: {
          invoiceNumber,
          schoolId: primarySchool.id,
          studentId: student.id,
          academicYearId: academicYear.id,
          discountId: discount ? discount.id : null,
          subtotal,
          discountAmount,
          totalAmount,
          paidAmount: config.payAmount,
          balanceAmount: Math.max(0, totalAmount - config.payAmount),
          currency: 'USD',
          status: config.status as any,
          dueDate,
          notes: `Standard term invoice for ${structure.name}`,
          items: {
            create: [
              {
                name: structure.name,
                amount: structure.amount,
                feeStructureId: structure.id,
              },
            ],
          },
        },
      });
    }

    // Record payment if payAmount > 0
    if (config.payAmount > 0) {
      const receiptNumber = `REC-2026-${receiptCounter.toString().padStart(5, '0')}`;
      receiptCounter++;

      const existingPayment = await prisma.feePayment.findUnique({
        where: { receiptNumber },
      });

      if (!existingPayment) {
        await prisma.feePayment.create({
          data: {
            receiptNumber,
            invoiceId: invoice.id,
            schoolId: primarySchool.id,
            studentId: student.id,
            recordedById: admin.id,
            amount: config.payAmount,
            currency: 'USD',
            paymentMethod: (config.payMethod as any) || 'CASH',
            paymentDate: new Date(),
            referenceNumber: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
            notes: `Cashier verification receipt.`,
          },
        });
        paymentCount++;
      }
    }
  }

  // 1 Extra Partial Payment to have multiple payments against one invoice (Config #3)
  const multiPayInvoice = await prisma.feeInvoice.findUnique({
    where: { invoiceNumber: 'INV-2026-1004' },
  });
  if (multiPayInvoice && multiPayInvoice.balanceAmount > 500) {
    const extraReceiptNumber = `REC-2026-${receiptCounter.toString().padStart(5, '0')}`;
    receiptCounter++;
    const existing = await prisma.feePayment.findUnique({ where: { receiptNumber: extraReceiptNumber } });
    if (!existing) {
      await prisma.feePayment.create({
        data: {
          receiptNumber: extraReceiptNumber,
          invoiceId: multiPayInvoice.id,
          schoolId: primarySchool.id,
          studentId: multiPayInvoice.studentId,
          recordedById: admin.id,
          amount: 500,
          currency: 'USD',
          paymentMethod: 'CASH',
          paymentDate: new Date(),
          referenceNumber: `TXN-INSTALLMENT-2`,
          notes: `Second installment payment.`,
        },
      });
      await prisma.feeInvoice.update({
        where: { id: multiPayInvoice.id },
        data: {
          paidAmount: multiPayInvoice.paidAmount + 500,
          balanceAmount: multiPayInvoice.balanceAmount - 500,
        },
      });
      paymentCount++;
    }
  }

  // 1 Payment Reversal example to demonstrate immutable audit preservation
  const reversalReceiptNumber = `REC-2026-${receiptCounter.toString().padStart(5, '0')}`;
  const existingReversal = await prisma.feePayment.findUnique({ where: { receiptNumber: reversalReceiptNumber } });
  if (!existingReversal && multiPayInvoice) {
    await prisma.feePayment.create({
      data: {
        receiptNumber: reversalReceiptNumber,
        invoiceId: multiPayInvoice.id,
        schoolId: primarySchool.id,
        studentId: multiPayInvoice.studentId,
        recordedById: admin.id,
        amount: 200,
        currency: 'USD',
        paymentMethod: 'CHEQUE',
        paymentDate: new Date(),
        referenceNumber: 'CHQ-BOUNCED-001',
        notes: 'Cheque returned by clearinghouse.',
        isReversed: true,
        reversalReason: 'Drawer account had insufficient funds; cheque bounced.',
      },
    });
    paymentCount++;
  }

  console.log(`✔ Seeded 8 Invoices and ${paymentCount} Fee Payments with receipts.`);
  console.log('--- Fee Management Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Fee seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
