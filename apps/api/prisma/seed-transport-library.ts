/**
 * MODULE: Realistic Seed Fixtures for Transport & Library Management (TASK 027 + TASK 028)
 *
 * PURPOSE:
 * Seeds realistic institutional fixtures for:
 * 1. Transport (8+ vehicles, 8+ drivers, 8+ routes, 8+ stops, 8+ allocations, sample trips, attendance, maintenance, expenses)
 * 2. Library (8+ books, 8+ physical copies, 8+ loans, 8+ reservations, overdue fines, policies)
 *
 * IDEMPOTENCY:
 * Checks for existing codes/registration numbers/ISBNs to prevent duplication.
 */

import {
  PrismaClient,
  VehicleType,
  VehicleMaintenanceStatus,
  DriverStatus,
  RouteDirection,
  BookCondition,
  BookCopyStatus,
  LoanStatus,
  ReservationStatus,
  LibraryFineStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Transport & Library Seeding (TASK 027 + TASK 028) ---');

  const schools = await prisma.school.findMany({
    include: {
      users: { where: { role: 'STUDENT' }, take: 12 },
    },
  });

  if (schools.length === 0) {
    console.error('No schools found. Please ensure database is seeded first.');
    return;
  }

  const primarySchool = schools[0];
  const schoolId = primarySchool.id;
  const students = primarySchool.users;

  const admin = await prisma.user.findFirst({
    where: { schoolId, role: 'SCHOOL_ADMIN' },
  }) || (await prisma.user.findFirst({ where: { role: 'PLATFORM_ADMIN' } }));

  console.log(`Seeding for School: ${primarySchool.name} (${primarySchool.code})`);

  // ==========================================
  // PART A: TRANSPORT MANAGEMENT SEED DATA
  // ==========================================
  console.log('Seeding Transport Fleet (8 Vehicles)...');
  const vehicleDefs = [
    { registrationNumber: 'ST-BUS-101', vehicleCode: 'BUS-01', vehicleType: VehicleType.BUS, seatingCapacity: 50, insuranceNumber: 'INS-2026-901', insuranceExpiry: new Date('2027-06-30'), registrationExpiry: new Date('2027-12-31'), maintenanceStatus: VehicleMaintenanceStatus.GOOD },
    { registrationNumber: 'ST-BUS-102', vehicleCode: 'BUS-02', vehicleType: VehicleType.BUS, seatingCapacity: 45, insuranceNumber: 'INS-2026-902', insuranceExpiry: new Date('2027-05-15'), registrationExpiry: new Date('2027-11-30'), maintenanceStatus: VehicleMaintenanceStatus.GOOD },
    { registrationNumber: 'ST-BUS-103', vehicleCode: 'BUS-03', vehicleType: VehicleType.BUS, seatingCapacity: 50, insuranceNumber: 'INS-2026-903', insuranceExpiry: new Date('2027-07-20'), registrationExpiry: new Date('2027-10-15'), maintenanceStatus: VehicleMaintenanceStatus.GOOD },
    { registrationNumber: 'ST-BUS-104', vehicleCode: 'BUS-04', vehicleType: VehicleType.BUS, seatingCapacity: 35, insuranceNumber: 'INS-2026-904', insuranceExpiry: new Date('2026-12-31'), registrationExpiry: new Date('2027-04-10'), maintenanceStatus: VehicleMaintenanceStatus.NEEDS_SERVICE },
    { registrationNumber: 'ST-MINI-201', vehicleCode: 'MINI-01', vehicleType: VehicleType.MINIBUS, seatingCapacity: 25, insuranceNumber: 'INS-2026-905', insuranceExpiry: new Date('2027-08-30'), registrationExpiry: new Date('2027-09-25'), maintenanceStatus: VehicleMaintenanceStatus.GOOD },
    { registrationNumber: 'ST-MINI-202', vehicleCode: 'MINI-02', vehicleType: VehicleType.MINIBUS, seatingCapacity: 22, insuranceNumber: 'INS-2026-906', insuranceExpiry: new Date('2027-03-31'), registrationExpiry: new Date('2027-08-15'), maintenanceStatus: VehicleMaintenanceStatus.GOOD },
    { registrationNumber: 'ST-VAN-301', vehicleCode: 'VAN-01', vehicleType: VehicleType.VAN, seatingCapacity: 14, insuranceNumber: 'INS-2026-907', insuranceExpiry: new Date('2027-09-10'), registrationExpiry: new Date('2027-10-01'), maintenanceStatus: VehicleMaintenanceStatus.GOOD },
    { registrationNumber: 'ST-VAN-302', vehicleCode: 'VAN-02', vehicleType: VehicleType.VAN, seatingCapacity: 14, insuranceNumber: 'INS-2026-908', insuranceExpiry: new Date('2026-11-20'), registrationExpiry: new Date('2027-02-15'), maintenanceStatus: VehicleMaintenanceStatus.UNDER_MAINTENANCE },
  ];

  const vehicles: any[] = [];
  for (const v of vehicleDefs) {
    let vehicle = await prisma.vehicle.findFirst({
      where: { schoolId, registrationNumber: v.registrationNumber },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          schoolId,
          ...v,
          isActive: true,
        },
      });
    }
    vehicles.push(vehicle);
  }

  console.log('Seeding Transport Drivers (8 Drivers)...');
  const driverDefs = [
    { name: 'Tariq Al-Mansoor', phone: '+966-50-111-2233', licenseNumber: 'DL-SA-98124', licenseExpiry: new Date('2028-05-12'), status: DriverStatus.ACTIVE },
    { name: 'Rashid Khan', phone: '+966-50-222-3344', licenseNumber: 'DL-SA-87235', licenseExpiry: new Date('2027-11-04'), status: DriverStatus.ACTIVE },
    { name: 'Sultan Al-Harbi', phone: '+966-50-333-4455', licenseNumber: 'DL-SA-76346', licenseExpiry: new Date('2029-01-19'), status: DriverStatus.ACTIVE },
    { name: 'Mohammed Iqbal', phone: '+966-50-444-5566', licenseNumber: 'DL-SA-65457', licenseExpiry: new Date('2028-08-22'), status: DriverStatus.ACTIVE },
    { name: 'Bilal Farooq', phone: '+966-50-555-6677', licenseNumber: 'DL-SA-54568', licenseExpiry: new Date('2027-09-15'), status: DriverStatus.ACTIVE },
    { name: 'Fahad Al-Zahrani', phone: '+966-50-666-7788', licenseNumber: 'DL-SA-43679', licenseExpiry: new Date('2029-04-30'), status: DriverStatus.ACTIVE },
    { name: 'Hamza Sheikh', phone: '+966-50-777-8899', licenseNumber: 'DL-SA-32780', licenseExpiry: new Date('2028-02-10'), status: DriverStatus.ACTIVE },
    { name: 'Zaid Al-Otaibi', phone: '+966-50-888-9900', licenseNumber: 'DL-SA-21891', licenseExpiry: new Date('2027-07-08'), status: DriverStatus.ACTIVE },
  ];

  const drivers: any[] = [];
  for (let i = 0; i < driverDefs.length; i++) {
    const d = driverDefs[i];
    const assignedVehicleId = vehicles[i]?.id;
    let driver = await prisma.driver.findFirst({
      where: { schoolId, licenseNumber: d.licenseNumber },
    });
    if (!driver) {
      driver = await prisma.driver.create({
        data: {
          schoolId,
          ...d,
          assignedVehicleId,
        },
      });
    }
    drivers.push(driver);
  }

  console.log('Seeding Transport Routes & Stops (8 Routes)...');
  const routeDefs = [
    {
      name: 'North Campus Route A - Olaya Corridor',
      code: 'ROUTE-01',
      direction: RouteDirection.ROUND_TRIP,
      stops: [
        { stopName: 'Olaya Towers Central', stopOrder: 1, latitude: 24.7136, longitude: 46.6753, scheduledTime: '06:45 AM' },
        { stopName: 'Al-Faisaliah Station Plaza', stopOrder: 2, latitude: 24.6901, longitude: 46.6852, scheduledTime: '07:00 AM' },
        { stopName: 'Tahlia Street Junction', stopOrder: 3, latitude: 24.7011, longitude: 46.6890, scheduledTime: '07:15 AM' },
        { stopName: 'Taibah School Main Gate', stopOrder: 4, latitude: 24.7200, longitude: 46.6600, scheduledTime: '07:30 AM' },
      ],
    },
    {
      name: 'South Campus Route B - Al-Malaz District',
      code: 'ROUTE-02',
      direction: RouteDirection.ROUND_TRIP,
      stops: [
        { stopName: 'Al-Malaz National Stadium', stopOrder: 1, latitude: 24.6612, longitude: 46.7380, scheduledTime: '06:50 AM' },
        { stopName: 'University Hospital Circle', stopOrder: 2, latitude: 24.6720, longitude: 46.7210, scheduledTime: '07:05 AM' },
        { stopName: 'King Abdullah Park Gate 3', stopOrder: 3, latitude: 24.6670, longitude: 46.7390, scheduledTime: '07:20 AM' },
        { stopName: 'Taibah School Main Gate', stopOrder: 4, latitude: 24.7200, longitude: 46.6600, scheduledTime: '07:35 AM' },
      ],
    },
    {
      name: 'East Campus Route C - Al-Rawdah & Naseem',
      code: 'ROUTE-03',
      direction: RouteDirection.PICKUP,
      stops: [
        { stopName: 'Rawdah Park Station', stopOrder: 1, latitude: 24.7501, longitude: 46.7780, scheduledTime: '06:40 AM' },
        { stopName: 'Khurais Road Crossing', stopOrder: 2, latitude: 24.7320, longitude: 46.7610, scheduledTime: '07:00 AM' },
        { stopName: 'Taibah School Main Gate', stopOrder: 3, latitude: 24.7200, longitude: 46.6600, scheduledTime: '07:25 AM' },
      ],
    },
    {
      name: 'West Campus Route D - Diplomatic Quarter',
      code: 'ROUTE-04',
      direction: RouteDirection.ROUND_TRIP,
      stops: [
        { stopName: 'DQ Plaza Main Roundabout', stopOrder: 1, latitude: 24.6850, longitude: 46.6210, scheduledTime: '06:55 AM' },
        { stopName: 'Tuwaiq Cultural Center', stopOrder: 2, latitude: 24.6790, longitude: 46.6280, scheduledTime: '07:10 AM' },
        { stopName: 'Taibah School Main Gate', stopOrder: 3, latitude: 24.7200, longitude: 46.6600, scheduledTime: '07:30 AM' },
      ],
    },
    {
      name: 'North-West Route E - Al-Nakheel & Yasmin',
      code: 'ROUTE-05',
      direction: RouteDirection.ROUND_TRIP,
      stops: [
        { stopName: 'Nakheel Boulevard Gate', stopOrder: 1, latitude: 24.7610, longitude: 46.6430, scheduledTime: '06:45 AM' },
        { stopName: 'Anas Ibn Malik Square', stopOrder: 2, latitude: 24.7890, longitude: 46.6280, scheduledTime: '07:05 AM' },
        { stopName: 'Taibah School Main Gate', stopOrder: 3, latitude: 24.7200, longitude: 46.6600, scheduledTime: '07:30 AM' },
      ],
    },
    {
      name: 'Central Express Route F - Al-Sulaimaniyah',
      code: 'ROUTE-06',
      direction: RouteDirection.ROUND_TRIP,
      stops: [
        { stopName: 'Sulaimaniyah Market Center', stopOrder: 1, latitude: 24.6980, longitude: 46.7050, scheduledTime: '06:50 AM' },
        { stopName: 'Military Hospital Junction', stopOrder: 2, latitude: 24.6820, longitude: 46.7180, scheduledTime: '07:10 AM' },
        { stopName: 'Taibah School Main Gate', stopOrder: 3, latitude: 24.7200, longitude: 46.6600, scheduledTime: '07:30 AM' },
      ],
    },
    {
      name: 'Suburban Route G - Al-Sahafa & Narjis',
      code: 'ROUTE-07',
      direction: RouteDirection.ROUND_TRIP,
      stops: [
        { stopName: 'Sahafa Metro Interchange', stopOrder: 1, latitude: 24.8050, longitude: 46.6520, scheduledTime: '06:40 AM' },
        { stopName: 'Othman Bin Affan Avenue', stopOrder: 2, latitude: 24.7950, longitude: 46.6710, scheduledTime: '07:00 AM' },
        { stopName: 'Taibah School Main Gate', stopOrder: 3, latitude: 24.7200, longitude: 46.6600, scheduledTime: '07:25 AM' },
      ],
    },
    {
      name: 'Afternoon Athletics Shuttle Route H',
      code: 'ROUTE-08',
      direction: RouteDirection.DROPOFF,
      stops: [
        { stopName: 'Taibah School Sports Complex', stopOrder: 1, latitude: 24.7200, longitude: 46.6600, scheduledTime: '03:30 PM' },
        { stopName: 'Al-Hilal Youth Training Field', stopOrder: 2, latitude: 24.6540, longitude: 46.6910, scheduledTime: '04:00 PM' },
        { stopName: 'Prince Faisal Olympic Arena', stopOrder: 3, latitude: 24.6710, longitude: 46.7320, scheduledTime: '04:30 PM' },
      ],
    },
  ];

  const routes: any[] = [];
  for (let i = 0; i < routeDefs.length; i++) {
    const r = routeDefs[i];
    const assignedVehicleId = vehicles[i]?.id;
    const assignedDriverId = drivers[i]?.id;

    let route = await prisma.transportRoute.findFirst({
      where: { schoolId, code: r.code },
      include: { stops: true },
    });

    if (!route) {
      route = await prisma.transportRoute.create({
        data: {
          schoolId,
          name: r.name,
          code: r.code,
          direction: r.direction,
          assignedVehicleId,
          assignedDriverId,
          isActive: true,
          stops: {
            create: r.stops,
          },
        },
        include: { stops: true },
      });
    }
    routes.push(route);
  }

  console.log('Seeding Student Transport Allocations (8+ Allocations)...');
  const allocations: any[] = [];
  for (let i = 0; i < Math.min(students.length, 8); i++) {
    const student = students[i];
    const route = routes[i % routes.length];
    const vehicle = vehicles[i % vehicles.length];
    const pickupStop = route.stops[0]?.id;
    const dropoffStop = route.stops[route.stops.length - 1]?.id;

    let alloc = await prisma.studentTransportAllocation.findFirst({
      where: { schoolId, studentId: student.id, routeId: route.id },
    });

    if (!alloc) {
      alloc = await prisma.studentTransportAllocation.create({
        data: {
          schoolId,
          studentId: student.id,
          routeId: route.id,
          vehicleId: vehicle.id,
          pickupStopId: pickupStop,
          dropoffStopId: dropoffStop,
          startDate: new Date('2026-09-01'),
          monthlyFee: 250.0,
          status: 'ACTIVE',
        },
      });
    }
    allocations.push(alloc);
  }

  console.log('Seeding Active Trips & Live Simulated GPS Positions...');
  const activeTrips: any[] = [];
  for (let i = 0; i < 2; i++) {
    const route = routes[i];
    const vehicle = vehicles[i];
    const driver = drivers[i];

    let trip = await prisma.transportTrip.findFirst({
      where: { schoolId, routeId: route.id, status: 'IN_PROGRESS' },
    });

    if (!trip) {
      trip = await prisma.transportTrip.create({
        data: {
          schoolId,
          routeId: route.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          tripType: route.direction,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      // Seed current GPS location for this active bus (Clearly marked as simulated)
      const stop = route.stops[1] || route.stops[0];
      await prisma.vehicleLocation.create({
        data: {
          tripId: trip.id,
          vehicleId: vehicle.id,
          latitude: stop ? stop.latitude + 0.002 : 24.7136,
          longitude: stop ? stop.longitude + 0.001 : 46.6753,
          accuracy: 5.0,
          speed: 42.5,
          heading: 180.0,
          isSimulated: true, // Clearly marked per requirement
        },
      });
    }
    activeTrips.push(trip);
  }

  console.log('Seeding Transport Attendance...');
  if (activeTrips.length > 0 && allocations.length > 0) {
    const trip = activeTrips[0];
    const student = students[0];
    const existingAtt = await prisma.transportAttendance.findFirst({
      where: { tripId: trip.id, studentId: student.id },
    });
    if (!existingAtt) {
      await prisma.transportAttendance.create({
        data: {
          tripId: trip.id,
          studentId: student.id,
          vehicleId: trip.vehicleId,
          status: 'BOARDED',
          recordedAt: new Date(),
          recordedById: admin?.id,
          notes: 'Boarded at Olaya Towers stop with RFID scan',
        },
      });
    }
  }

  console.log('Seeding Vehicle Maintenance & Fuel Expenses...');
  for (let i = 0; i < 3; i++) {
    const vehicle = vehicles[i];
    const existingMaint = await prisma.vehicleMaintenance.findFirst({
      where: { schoolId, vehicleId: vehicle.id },
    });
    if (!existingMaint) {
      await prisma.vehicleMaintenance.create({
        data: {
          schoolId,
          vehicleId: vehicle.id,
          maintenanceType: i === 0 ? 'Brake Pad & Rotor Replacement' : 'Scheduled 30,000 KM Engine Service',
          description: 'Full inspection, oil filter, hydraulic check, air conditioning filter change.',
          cost: 1450.0,
          serviceDate: new Date('2026-09-15'),
          nextServiceDue: new Date('2027-03-15'),
          serviceProvider: 'Al-Jazirah Vehicles Services Co.',
        },
      });
    }

    const existingExp = await prisma.vehicleExpense.findFirst({
      where: { schoolId, vehicleId: vehicle.id },
    });
    if (!existingExp) {
      await prisma.vehicleExpense.create({
        data: {
          schoolId,
          vehicleId: vehicle.id,
          expenseType: 'FUEL',
          amount: 320.0,
          date: new Date('2026-10-10'),
          receiptNumber: `REC-GAS-${1000 + i}`,
          description: 'Diesel refueling 160L @ SASCO Station 14',
        },
      });
    }
  }

  // ==========================================
  // PART B: LIBRARY MANAGEMENT SEED DATA
  // ==========================================
  console.log('Seeding Library Policies (Student & Teacher Policies)...');
  const policyDefs = [
    { borrowerType: 'STUDENT', maxBooks: 3, loanPeriodDays: 14, renewalLimit: 2, finePerDay: 2.0, gracePeriodDays: 2, maxFineAmount: 50.0 },
    { borrowerType: 'TEACHER', maxBooks: 8, loanPeriodDays: 30, renewalLimit: 3, finePerDay: 1.0, gracePeriodDays: 5, maxFineAmount: 30.0 },
  ];

  for (const pol of policyDefs) {
    const existing = await prisma.libraryPolicy.findFirst({
      where: { schoolId, borrowerType: pol.borrowerType },
    });
    if (!existing) {
      await prisma.libraryPolicy.create({
        data: {
          schoolId,
          ...pol,
        },
      });
    }
  }

  console.log('Seeding Library Book Catalog (8 Titles)...');
  const bookDefs = [
    { title: 'Fundamentals of Physics: Mechanics & Thermodynamics', isbn: '978-0134092508', author: 'David Halliday & Robert Resnick', publisher: 'Wiley Publishing', category: 'Science', subject: 'Physics', language: 'English', edition: '11th Edition', publicationYear: 2021, description: 'Comprehensive foundational textbook for advanced physics students.' },
    { title: 'Calculus: Early Transcendentals', isbn: '978-1285741550', author: 'James Stewart', publisher: 'Cengage Learning', category: 'Mathematics', subject: 'Calculus', language: 'English', edition: '8th Edition', publicationYear: 2020, description: 'Rigorous standard calculus reference covering differential and integral calculus.' },
    { title: 'Biology: A Global Approach', isbn: '978-1292170435', author: 'Neil A. Campbell & Jane B. Reece', publisher: 'Pearson Education', category: 'Science', subject: 'Biology', language: 'English', edition: '12th Edition', publicationYear: 2022, description: 'Core principles of cellular biology, genetics, and ecology.' },
    { title: 'History of the Arabian Peninsula & Islamic Civilization', isbn: '978-6035002141', author: 'Dr. Abdulaziz Al-Hokail', publisher: 'King Saud University Press', category: 'History', subject: 'Islamic History', language: 'Arabic', edition: '3rd Edition', publicationYear: 2019, description: 'In-depth historical narrative of cultural and geopolitical development in Arabia.' },
    { title: 'Introduction to Algorithms', isbn: '978-0262033848', author: 'Thomas H. Cormen & Charles E. Leiserson', publisher: 'MIT Press', category: 'Computer Science', subject: 'Algorithms', language: 'English', edition: '4th Edition', publicationYear: 2022, description: 'Essential algorithms, data structures, and algorithmic complexity analysis.' },
    { title: 'Principles of Chemistry: Structure & Reactivity', isbn: '978-0321943170', author: 'Nivaldo J. Tro', publisher: 'Pearson Education', category: 'Science', subject: 'Chemistry', language: 'English', edition: '4th Edition', publicationYear: 2021, description: 'Modern molecular approach to chemical principles and laboratory kinetics.' },
    { title: 'Arabic Rhetoric & Classical Literature (Al-Balagha)', isbn: '978-9953378901', author: 'Ahmad Al-Hashimi', publisher: 'Dar Al-Maarif', category: 'Literature', subject: 'Arabic Linguistics', language: 'Arabic', edition: 'Revised Edition', publicationYear: 2018, description: 'Classical study of Arabic eloquence, metaphors, and literary structures.' },
    { title: 'World Geography: Physical & Human Systems', isbn: '978-0134444550', author: 'Alan H. Strahler', publisher: 'John Wiley & Sons', category: 'Social Studies', subject: 'Geography', language: 'English', edition: '6th Edition', publicationYear: 2020, description: 'Global exploration of environmental systems and human-geographical distribution.' },
  ];

  const books: any[] = [];
  for (const b of bookDefs) {
    let book = await prisma.libraryBook.findFirst({
      where: { schoolId, isbn: b.isbn },
    });
    if (!book) {
      book = await prisma.libraryBook.create({
        data: {
          schoolId,
          ...b,
          isArchived: false,
        },
      });
    }
    books.push(book);
  }

  console.log('Seeding Physical Book Copies (16+ Copies, at least 2 per title)...');
  const bookCopies: any[] = [];
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    for (let c = 1; c <= 2; c++) {
      const accessionNumber = `ACC-${book.category.substring(0, 3).toUpperCase()}-${1000 + i * 10 + c}`;
      let copy = await prisma.bookCopy.findFirst({
        where: { schoolId, accessionNumber },
      });
      if (!copy) {
        copy = await prisma.bookCopy.create({
          data: {
            schoolId,
            bookId: book.id,
            accessionNumber,
            barcode: `BAR-${accessionNumber}`,
            shelfLocation: `Stack ${String.fromCharCode(65 + (i % 6))}-Shelf ${c}`,
            condition: BookCondition.EXCELLENT,
            status: BookCopyStatus.AVAILABLE,
          },
        });
      }
      bookCopies.push(copy);
    }
  }

  console.log('Seeding Book Loans (8+ Loans across active, returned, and overdue states)...');
  const now = new Date();
  const loans: any[] = [];

  for (let i = 0; i < Math.min(students.length, 8); i++) {
    const student = students[i];
    const copy = bookCopies[i];
    const book = books[Math.floor(i / 2)];

    let loan = await prisma.bookLoan.findFirst({
      where: { copyId: copy.id, borrowerId: student.id },
    });

    if (!loan) {
      if (i === 0 || i === 1) {
        // Active Loan (on-time)
        const issueDate = new Date(now.getTime() - 4 * 24 * 3600 * 1000);
        const dueDate = new Date(now.getTime() + 10 * 24 * 3600 * 1000);
        loan = await prisma.bookLoan.create({
          data: {
            schoolId,
            bookId: book.id,
            copyId: copy.id,
            borrowerType: 'STUDENT',
            borrowerId: student.id,
            issueDate,
            dueDate,
            status: LoanStatus.ISSUED,
            issuedById: admin?.id,
          },
        });
        await prisma.bookCopy.update({
          where: { id: copy.id },
          data: { status: BookCopyStatus.ISSUED },
        });
      } else if (i === 2 || i === 3) {
        // Returned Loan
        const issueDate = new Date(now.getTime() - 20 * 24 * 3600 * 1000);
        const dueDate = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
        const returnDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        loan = await prisma.bookLoan.create({
          data: {
            schoolId,
            bookId: book.id,
            copyId: copy.id,
            borrowerType: 'STUDENT',
            borrowerId: student.id,
            issueDate,
            dueDate,
            returnDate,
            status: LoanStatus.RETURNED,
            issuedById: admin?.id,
            returnedById: admin?.id,
          },
        });
      } else {
        // Overdue Loan with Fine scenario
        const issueDate = new Date(now.getTime() - 25 * 24 * 3600 * 1000);
        const dueDate = new Date(now.getTime() - 5 * 24 * 3600 * 1000); // 5 days overdue
        loan = await prisma.bookLoan.create({
          data: {
            schoolId,
            bookId: book.id,
            copyId: copy.id,
            borrowerType: 'STUDENT',
            borrowerId: student.id,
            issueDate,
            dueDate,
            status: LoanStatus.OVERDUE,
            issuedById: admin?.id,
          },
        });
        await prisma.bookCopy.update({
          where: { id: copy.id },
          data: { status: BookCopyStatus.ISSUED },
        });

        // Seed fine record for this overdue loan
        const overdueDays = 5;
        const fineAmount = 10.0; // 5 days * 2 SAR/day
        const existingFine = await prisma.libraryFine.findFirst({
          where: { loanId: loan.id },
        });
        if (!existingFine) {
          await prisma.libraryFine.create({
            data: {
              schoolId,
              loanId: loan.id,
              borrowerType: 'STUDENT',
              borrowerId: student.id,
              amount: fineAmount,
              balanceAmount: fineAmount,
              overdueDays,
              status: LibraryFineStatus.UNPAID,
            },
          });
        }
      }
    }
    loans.push(loan);
  }

  console.log('Seeding Book Reservations (8+ Reservations)...');
  for (let i = 0; i < Math.min(students.length, 8); i++) {
    const student = students[i];
    const book = books[(i + 3) % books.length];

    const existingRes = await prisma.bookReservation.findFirst({
      where: { schoolId, bookId: book.id, borrowerId: student.id },
    });

    if (!existingRes) {
      await prisma.bookReservation.create({
        data: {
          schoolId,
          bookId: book.id,
          borrowerType: 'STUDENT',
          borrowerId: student.id,
          reservationDate: new Date(),
          expiryDate: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
          status: ReservationStatus.PENDING,
          queuePosition: 1,
        },
      });
    }
  }

  console.log('--- Transport & Library Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error running transport & library seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
