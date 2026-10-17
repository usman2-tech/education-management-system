/**
 * MODULE: Library Management Controller (TASK 028)
 *
 * PURPOSE:
 * Exposes versioned REST endpoints for library catalog, copy inventory,
 * transactional issue/return/renew, reservations, fine waivers, policy management,
 * and role-scoped student/teacher/parent views.
 *
 * SECURITY:
 * Guarded by JwtAuthGuard and RolesGuard.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  CreateBookDto,
  UpdateBookDto,
  CreateBookCopyDto,
  UpdateBookCopyDto,
  IssueBookDto,
  ReturnBookDto,
  RenewLoanDto,
  CreateReservationDto,
  WaiveFineDto,
  UpdatePolicyDto,
} from './dto/library.dto';

@Controller('library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  // ---------------------------------------------------------------------------
  // 1. REPORTS & KPIS
  // ---------------------------------------------------------------------------

  @Get('reports')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getReports(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.libraryService.getReports(user, schoolId);
  }

  // ---------------------------------------------------------------------------
  // 2. BOOK CATALOG
  // ---------------------------------------------------------------------------

  @Get('books')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT
  )
  async listBooks(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
    @Query('query') query?: string,
    @Query('category') category?: string,
    @Query('isArchived') isArchived?: string
  ) {
    const archived = isArchived === 'true';
    return this.libraryService.listBooks(user, schoolId, query, category, archived);
  }

  @Get('books/:id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT
  )
  async getBook(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.libraryService.getBook(id, user);
  }

  @Post('books')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createBook(
    @Body() dto: CreateBookDto,
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.libraryService.createBook(dto, user, schoolId);
  }

  @Put('books/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateBook(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.libraryService.updateBook(id, dto, user);
  }

  // ---------------------------------------------------------------------------
  // 3. PHYSICAL COPIES
  // ---------------------------------------------------------------------------

  @Get('copies')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async listCopies(
    @CurrentUser() user: AuthUser,
    @Query('bookId') bookId?: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.libraryService.listCopies(user, bookId, schoolId);
  }

  @Post('copies')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createCopy(
    @Body() dto: CreateBookCopyDto,
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.libraryService.createCopy(dto, user, schoolId);
  }

  @Put('copies/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateCopy(
    @Param('id') id: string,
    @Body() dto: UpdateBookCopyDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.libraryService.updateCopy(id, dto, user);
  }

  // ---------------------------------------------------------------------------
  // 4. BOOK ISSUE, RETURN & RENEW
  // ---------------------------------------------------------------------------

  @Post('loans/issue')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async issueBook(@Body() dto: IssueBookDto, @CurrentUser() user: AuthUser) {
    return this.libraryService.issueBook(dto, user);
  }

  @Post('loans/return')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async returnBook(@Body() dto: ReturnBookDto, @CurrentUser() user: AuthUser) {
    return this.libraryService.returnBook(dto, user);
  }

  @Post('loans/renew')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async renewLoan(@Body() dto: RenewLoanDto, @CurrentUser() user: AuthUser) {
    return this.libraryService.renewLoan(dto, user);
  }

  // ---------------------------------------------------------------------------
  // 5. RESERVATIONS
  // ---------------------------------------------------------------------------

  @Post('reservations')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async reserveBook(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.libraryService.reserveBook(dto, user);
  }

  @Delete('reservations/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  async cancelReservation(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser
  ) {
    return this.libraryService.cancelReservation(id, user);
  }

  // ---------------------------------------------------------------------------
  // 6. FINES & WAIVERS
  // ---------------------------------------------------------------------------

  @Get('fines')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async listFines(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
    @Query('status') status?: string
  ) {
    return this.libraryService.listFines(user, schoolId, status);
  }

  @Post('fines/waive')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async waiveFine(@Body() dto: WaiveFineDto, @CurrentUser() user: AuthUser) {
    return this.libraryService.waiveFine(dto, user);
  }

  // ---------------------------------------------------------------------------
  // 7. BORROWING POLICIES
  // ---------------------------------------------------------------------------

  @Get('policies')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getPolicies(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.libraryService.getPolicies(user, schoolId);
  }

  @Put('policies/:borrowerType')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updatePolicy(
    @Param('borrowerType') borrowerType: 'STUDENT' | 'TEACHER',
    @Body() dto: UpdatePolicyDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.libraryService.updatePolicy(borrowerType, dto, user);
  }

  // ---------------------------------------------------------------------------
  // 8. BORROWER SELF-SERVICE
  // ---------------------------------------------------------------------------

  @Get('my-loans')
  @Roles(UserRole.TEACHER, UserRole.STUDENT)
  async getMyLibrary(@CurrentUser() user: AuthUser) {
    return this.libraryService.getMyLibrary(user);
  }

  @Get('parent/child/:childId')
  @Roles(UserRole.PARENT)
  async getParentChildLibrary(
    @Param('childId') childId: string,
    @CurrentUser() user: AuthUser
  ) {
    return this.libraryService.getParentChildLibrary(childId, user);
  }
}
