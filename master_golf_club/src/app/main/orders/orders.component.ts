import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CollectionService } from '../common-service/collection/collection.service';
import { 
  faCalendarAlt, faSpinner, faExclamationTriangle, faTimes,
  faCheckCircle, faUsers, faInfoCircle, faEye, faPlus, faCheck, faBan,
  faCalendarCheck, faHandshake, faClock
} from '@fortawesome/free-solid-svg-icons';

interface Booking {
  id: number;
  booking_id: string;
  request_id?: string;
  memberName: string;
  memberFullName?: string;
  memberGolfClubId?: string;
  courseName: string;
  course?: number;
  tee?: number;
  bookingDate: string;
  endTime?: string;
  participants: number;
  maxParticipants?: number;
  status: string;
  is_join_request: boolean;
  original_booking?: number;
  originalBookingInfo?: any;
  originalBookingId?: number;
  originalBookerId?: string;
  originalBookerName?: string;
  joinRequests?: Booking[];

  slotStatus?: string;
  availableSpots?: number;
  slotParticipantCount?: number;
  canJoinSlot?: boolean;
  teeInfo?: string;
  formattedDate?: string;
  isSlotFull?: boolean;
  canAcceptMoreParticipants?: boolean;
  hasMultipleSlots?: boolean;
  isMultiSlotBooking?: boolean;
  totalParticipants?: number;
  booking_time?: string;
  teeName?: string;
  slot_status?: string;
  slot_order?: number;
  slotDate?: string;
  createdAt?: string;
  slots?: Array<{
    id: number;
    tee: number;
    teeInfo: string;
    teeName?: string;
    courseName?: string;
    booking_time: string;
    participants: number;
    slot_order: number;
    slot_status: string;
    endTime: string;
    slot_date?: string;
    created_at?: string;
    formatted_created_date?: string;
  }>;
  earliestTime?: string;
  latestTime?: string;
  teeSummary?: string;
  // New fields for order management
  isOwnBooking?: boolean;
  canAddParticipants?: boolean;
  isIncomingRequest?: boolean;
  displayType?: 'own_booking' | 'sent_request' | 'received_request';
  statusType?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterMemberId?: string;
  // Participant information for merged bookings
  allParticipantsInfo?: Array<{
    member_id: number;
    member_name: string;
    participants: number;
    is_original_booker: boolean;
    join_request_id?: number;
    approved_at?: string;
  }>;
  
  // Additional properties for enhanced functionality
  bookingTime?: string;
  totalParticipantsIfApproved?: number;
  // Required properties that were missing
  slotTime?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  createdAt: string;
  relatedBookingInfo?: any;
  related_booking?: number;
}

interface OrderStatistics {
  total: number;
  confirmed: number;
  pendingRequests: number;
  requestsAccepted: number;
  acceptRejectActions: number;

}

interface JoinRequest {
  id: number;
  originalBookingId: number;
  memberName: string;
  memberFullName?: string;
  courseName: string;
  tee: number;
  teeInfo: string;
  teeName: string;
  bookingDate: string;
  bookingTime: string;
  participants: number;
  status: string;
  totalParticipantsIfApproved: number;
  createdAt: string;
  formattedCreatedDate?: string;
  // Additional properties for enhanced functionality
  requestId?: string;
  requesterId?: number;
  requesterName?: string;
  requesterMemberId?: string;
  requestDate?: string;
  requestedParticipants?: number;
  originalBookerId?: string;
  originalBookerName?: string;
  currentSlotStatus?: {
    currentParticipants: number;
    maxParticipants: number;
    availableSlots: number;
    slotStatus: string;
  };
  // Required properties that were missing
  slotDate?: string;
  slotTime?: string;
}

interface EnhancedStatistics {
  total_bookings: number;
  confirmed: number;
  pending_sent_requests: number;
  pending_received_requests: number;
  sent_requests_accepted: number;
  received_requests_accepted: number;
  rejected_received_requests: number;
  rejected_sent_requests: number;
  own_bookings_count: number;
  sent_requests_count: number;
  received_requests_count: number;
}

interface EnhancedOrdersData {
  own_bookings: Booking[];
  sent_requests: JoinRequest[];
  received_requests: JoinRequest[];
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, RouterModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  // UK timezone utilities
  private ukTimezone = 'Europe/London';
  
  // Helper method to get current UK time
  private getCurrentUKTime(): Date {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: this.ukTimezone }));
  }
  
  // Helper method to format date for UK timezone
  private formatDateForUK(date: Date): string {
    return date.toLocaleDateString('en-GB', { 
      timeZone: this.ukTimezone,
      day: 'numeric', 
      month: 'short', 
      year: '2-digit' 
    });
  }
  
  // Helper method to format time for UK timezone
  private formatTimeForUK(date: Date): string {
    return date.toLocaleTimeString('en-GB', { 
      timeZone: this.ukTimezone,
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  }
  
  // Helper method to check if date is today in UK timezone
  private isTodayInUK(date: Date): boolean {
    const ukNow = this.getCurrentUKTime();
    return date.toDateString() === ukNow.toDateString();
  }
  
  bookings: Booking[] = [];
  notifications: Notification[] = [];
  unreadCount = 0;
  isLoading = false;
  errorMessage = '';
  selectedBooking: Booking | null = null;
  showBookingDetails = false;
  selectedBookingForParticipants: Booking | null = null;
  showParticipantModal = false;
  requestedParticipants = 1;
  
  // New modal states
  selectedJoinRequestForReview: Booking | null = null;
  reviewAction: 'approve' | 'reject' = 'approve';
  
  // Pending review requests
  pendingReviewRequests: any[] = [];
  showPendingReviewModal = false;

  // Enhanced statistics (8 counters)
  enhancedStatistics: EnhancedStatistics = {
    total_bookings: 0,
    confirmed: 0,
    pending_sent_requests: 0,
    pending_received_requests: 0,
    sent_requests_accepted: 0,
    received_requests_accepted: 0,
    rejected_received_requests: 0,
    rejected_sent_requests: 0,
    own_bookings_count: 0,
    sent_requests_count: 0,
    received_requests_count: 0
  };

  // Enhanced orders data
  enhancedOrdersData: EnhancedOrdersData = {
    own_bookings: [],
    sent_requests: [],
    received_requests: []
  };

  // Toggle and pagination properties
  showBookingsOnly: boolean = true; // Toggle between bookings and requests
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  Math = Math; // Make Math available in template

  // Filter state
  selectedStatusFilter: string = 'all';
  statusFilters = [
    { value: 'all', label: 'All Bookings', count: 0 },
    { value: 'own_bookings', label: 'Own Bookings', count: 0 },
    { value: 'sent_requests', label: 'Sent Requests', count: 0 },
    { value: 'received_requests', label: 'Received Requests', count: 0 }
  ];

  // Icons
  calendarIcon = faCalendarAlt;
  spinnerIcon = faSpinner;
  exclamationTriangleIcon = faExclamationTriangle;
  timesIcon = faTimes;
  checkCircleIcon = faCheckCircle;
  usersIcon = faUsers;
  infoIcon = faInfoCircle;
  eyeIcon = faEye;
  plusIcon = faPlus;
  checkIcon = faCheck;
  banIcon = faBan;
  calendarCheckIcon = faCalendarCheck;
  handshakeIcon = faHandshake;
  clockIcon = faClock;

  // Enhanced Join Request Management
  incomingJoinRequests: JoinRequest[] = [];
  outgoingJoinRequests: JoinRequest[] = [];
  joinRequestStatistics: any;
  showJoinRequestModal = false;
  selectedJoinRequest: JoinRequest | null = null;
  joinRequestAction: 'approve' | 'reject' = 'approve';

  // Confirmation modal properties
  showConfirmationModal: boolean = false;
  confirmationAction: 'approve' | 'reject' = 'approve';
  confirmationRequest: JoinRequest | null = null;

  constructor(
    private collectionService: CollectionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadEnhancedData();
    this.loadNotifications();
    this.loadUnreadCount();
    
    // Check if redirected from notification
    this.checkNotificationRedirect();
  }

  private checkNotificationRedirect() {
    this.route.queryParams.subscribe(params => {
      const notificationId = params['notification'];
      if (notificationId) {
        this.handleNotificationClick(parseInt(notificationId));
        // Clear the query parameter
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  // Load enhanced data (statistics + orders)
  loadEnhancedData() {
    this.isLoading = true;
    this.errorMessage = '';

    // Load statistics and orders data in parallel
    Promise.all([
      this.collectionService.getEnhancedOrderStatistics(),
      this.collectionService.getEnhancedOrdersData()
    ]).then(([statsResponse, ordersResponse]) => {
      if (statsResponse.data.code === 1) {
        this.enhancedStatistics = statsResponse.data.data;
        this.updateFilterCounts();
      }

      if (ordersResponse.data.code === 1) {
        this.enhancedOrdersData = ordersResponse.data.data;
        this.processEnhancedOrdersData();
      }

      this.isLoading = false;
    }).catch(error => {
      console.error('Error loading enhanced data:', error);
      this.errorMessage = 'Failed to load orders data. Please try again.';
      this.isLoading = false;
    });
  }

  // Process enhanced orders data for display
  processEnhancedOrdersData() {
    // Convert all data to unified booking format for table display
    this.bookings = [];

    console.log('Enhanced orders data:', this.enhancedOrdersData);

    // Add own bookings
    this.enhancedOrdersData.own_bookings.forEach(booking => {
      console.log('Own booking data:', booking);
      this.bookings.push({
        ...booking,
        isOwnBooking: true,
        displayType: 'own_booking' as 'own_booking',
        statusType: this.getBookingStatusType(booking)
      });
    });

    // Add sent requests
    this.enhancedOrdersData.sent_requests.forEach(request => {
      console.log('Sent request data:', request);
      const convertedBooking = {
        ...this.convertJoinRequestToBooking(request),
        isOwnBooking: false,
        displayType: 'sent_request' as 'sent_request',
        statusType: this.getSentRequestStatusType(request)
      };
      console.log('Converted sent request booking:', convertedBooking);
      this.bookings.push(convertedBooking);
    });

    // Add received requests
    this.enhancedOrdersData.received_requests.forEach(request => {
      console.log('Received request data:', request);
      const convertedBooking = {
        ...this.convertJoinRequestToBooking(request),
        isOwnBooking: false,
        displayType: 'received_request' as 'received_request',
        statusType: this.getReceivedRequestStatusType(request)
      };
      console.log('Converted received request booking:', convertedBooking);
      this.bookings.push(convertedBooking);
    });

    // Sort by creation date (newest first)
    this.bookings.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }

  // Convert join request to booking format for unified display
  convertJoinRequestToBooking(request: JoinRequest): Booking {
    return {
      id: request.id,
      booking_id: request.requestId || '',
      request_id: request.requestId,
      memberName: request.requesterName || '',
      memberFullName: request.requesterName || '',
      memberGolfClubId: request.requesterMemberId,
      requesterMemberId: request.requesterMemberId,
      courseName: request.courseName || '',
      teeInfo: request.tee || '',
      bookingDate: this.formatDate(request.requestDate || ''),
      formattedDate: this.formatDate(request.requestDate || ''),
      slotDate: request.slotDate,
      booking_time: request.slotTime,
      participants: request.requestedParticipants || 0,
      status: request.status || '',
      is_join_request: true,
      createdAt: request.requestDate,
      originalBookingId: request.originalBookingId ? (typeof request.originalBookingId === 'string' ? parseInt(request.originalBookingId) : request.originalBookingId) : undefined,
      // Additional properties for enhanced display
      originalBookerName: request.originalBookerName,
      originalBookerId: request.originalBookerId,
      currentSlotStatus: request.currentSlotStatus,
      totalParticipantsIfApproved: request.totalParticipantsIfApproved
    } as Booking;
  }

  // Update filter counts based on enhanced statistics
  updateFilterCounts() {
    this.statusFilters = [
      { 
        value: 'all', 
        label: 'All Bookings', 
        count: this.enhancedStatistics.total_bookings + 
               this.enhancedStatistics.pending_sent_requests + 
               this.enhancedStatistics.pending_received_requests 
      },
      { 
        value: 'own_bookings', 
        label: 'Own Bookings', 
        count: this.enhancedStatistics.own_bookings_count 
      },
      { 
        value: 'sent_requests', 
        label: 'Sent Requests', 
        count: this.enhancedStatistics.sent_requests_count 
      },
      { 
        value: 'received_requests', 
        label: 'Received Requests', 
        count: this.enhancedStatistics.received_requests_count 
      }
    ];
  }

  // Get status type for own bookings
  getBookingStatusType(booking: Booking): string {
    if (booking.status === 'confirmed' || booking.status === 'completed') {
      return 'CONFIRMED';
    }
    return 'PENDING';
  }

  // Get status type for sent requests
  getSentRequestStatusType(request: JoinRequest): string {
    switch (request.status) {
      case 'pending_approval':
        return 'SENT REQUEST PENDING';
      case 'approved':
        return 'SENT REQUEST ACCEPTED';
      case 'rejected':
        return 'REJECTED SENT';
      default:
        return 'UNKNOWN';
    }
  }

  // Get status type for received requests
  getReceivedRequestStatusType(request: JoinRequest): string {
    switch (request.status) {
      case 'pending_approval':
        return 'RECEIVE REQUEST PENDING';
      case 'approved':
        return 'RECEIVE REQUEST ACCEPTED';
      case 'rejected':
        return 'REJECTED RECEIVED';
      default:
        return 'UNKNOWN';
    }
  }

  // Handle approve join request
  async approveJoinRequest(request: JoinRequest) {
    try {
      const response = await this.collectionService.approveJoinRequest(request.id);
      if (response.data.code === 1) {
        // Refresh data after successful approval
        this.loadEnhancedData();
        // Show success message
        alert(`Join request from ${request.requesterName} has been approved successfully!`);
      } else {
        alert('Failed to approve join request. Please try again.');
      }
    } catch (error) {
      console.error('Error approving join request:', error);
      alert('Error approving join request. Please try again.');
    }
  }

  // Handle reject join request
  async rejectJoinRequest(request: JoinRequest, notes?: string) {
    try {
      const response = await this.collectionService.rejectJoinRequest(request.id, notes);
      if (response.data.code === 1) {
        // Refresh data after successful rejection
        this.loadEnhancedData();
        // Show success message
        alert(`Join request from ${request.requesterName} has been rejected.`);
      } else {
        alert('Failed to reject join request. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting join request:', error);
      alert('Error rejecting join request. Please try again.');
    }
  }

  // Show review request modal
  showReviewRequestModal(request: JoinRequest) {
    this.selectedJoinRequest = request;
    this.showJoinRequestModal = true;
  }

  // Close review request modal
  closeReviewRequestModal() {
    this.selectedJoinRequest = null;
    this.showJoinRequestModal = false;
  }

  // Handle review request action
  async handleReviewRequest(action: 'approve' | 'reject') {
    if (!this.selectedJoinRequest) return;

    if (action === 'approve') {
      await this.approveJoinRequest(this.selectedJoinRequest);
    } else {
      await this.rejectJoinRequest(this.selectedJoinRequest);
    }

    this.closeReviewRequestModal();
  }

  // Enhanced status display methods
  getEnhancedStatusDisplayText(booking: Booking): string {
    if (booking.statusType) {
      return booking.statusType;
    }
    
    // Fallback to existing logic
    return this.getStatusDisplayText(booking);
  }

  getEnhancedStatusBadgeClass(booking: Booking): string {
    const statusType = booking.statusType || '';
    
    switch (statusType) {
      case 'CONFIRMED':
        return 'badge bg-success';
      case 'RECEIVE REQUEST PENDING':
        return 'badge bg-warning';
      case 'RECEIVE REQUEST ACCEPTED':
        return 'badge bg-light-success';
      case 'SENT REQUEST PENDING':
        return 'badge bg-info';
      case 'SENT REQUEST ACCEPTED':
        return 'badge bg-primary';
      case 'REJECTED RECEIVED':
        return 'badge bg-danger';
      case 'REJECTED SENT':
        return 'badge bg-dark';
      default:
        return 'badge bg-secondary';
    }
  }

  // Enhanced action methods
  showAddParticipantsModal(booking: Booking) {
    this.selectedBookingForParticipants = booking;
    this.showParticipantModal = true;
  }

  viewBookingDetails(booking: Booking) {
    console.log('Selected booking for details modal:', booking);
    console.log('Member ID fields:', {
      memberGolfClubId: booking.memberGolfClubId,
      requesterMemberId: booking.requesterMemberId,
      originalBookerId: booking.originalBookerId
    });
    this.selectedBooking = booking;
    this.showBookingDetails = true;
  }

  // Enhanced filtering with toggle and pagination
  getFilteredBookings(): Booking[] {
    if (!this.bookings) return [];

    let filtered = this.bookings;
    
    // Apply toggle filter first
    if (this.showBookingsOnly) {
      // My Bookings: Show original bookings + accepted/rejected join requests
      filtered = filtered.filter(booking => 
        !booking.is_join_request || 
        (booking.is_join_request && (booking.status === 'approved' || booking.status === 'rejected'))
      );
    } else {
      // Join Requests: Show only pending join requests
      filtered = filtered.filter(booking => 
        booking.is_join_request && booking.status === 'pending_approval'
      );
    }
    
    // Apply status filter
    switch (this.selectedStatusFilter) {
      case 'own_bookings':
        filtered = filtered.filter(b => b.displayType === 'own_booking');
        break;
      case 'sent_requests':
        filtered = filtered.filter(b => b.displayType === 'sent_request');
        break;
      case 'received_requests':
        filtered = filtered.filter(b => b.displayType === 'received_request');
        break;
      case 'all':
      default:
        // Keep all filtered results
        break;
    }
    
    return filtered;
  }

  // Pagination methods
  getPaginatedBookings(): Booking[] {
    const filtered = this.getFilteredBookings();
    this.updatePagination(filtered.length);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }

  updatePagination(totalItems: number) {
    this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Toggle methods
  toggleBookingRequestView() {
    this.showBookingsOnly = !this.showBookingsOnly;
    this.currentPage = 1; // Reset to first page when toggling
  }

  setViewType(showBookings: boolean) {
    this.showBookingsOnly = showBookings;
    this.currentPage = 1; // Reset to first page when switching
  }

  getBookingsCount(): number {
    if (!this.bookings) return 0;
    // Count original bookings + accepted/rejected join requests
    return this.bookings.filter(booking => 
      !booking.is_join_request || 
      (booking.is_join_request && (booking.status === 'approved' || booking.status === 'rejected'))
    ).length;
  }

  getRequestsCount(): number {
    if (!this.bookings) return 0;
    // Count only pending join requests
    return this.bookings.filter(booking => 
      booking.is_join_request && booking.status === 'pending_approval'
    ).length;
  }

  // Refresh data method
  refreshData() {
    this.loadEnhancedData();
  }

  // Confirmation modal methods
  showConfirmationForApproval(request: JoinRequest) {
    this.confirmationRequest = request;
    this.confirmationAction = 'approve';
    this.showConfirmationModal = true;
  }

  showConfirmationForRejection(request: JoinRequest) {
    this.confirmationRequest = request;
    this.confirmationAction = 'reject';
    this.showConfirmationModal = true;
  }

  closeConfirmationModal() {
    this.showConfirmationModal = false;
    this.confirmationRequest = null;
  }

  async confirmAction() {
    if (!this.confirmationRequest) return;

    try {
      if (this.confirmationAction === 'approve') {
        await this.collectionService.approveJoinRequest(this.confirmationRequest.id);
      } else {
        await this.collectionService.rejectJoinRequest(this.confirmationRequest.id);
      }
      
      // Close modal and refresh data
      this.closeConfirmationModal();
      this.refreshData();
      
    } catch (error) {
      console.error(`Error ${this.confirmationAction}ing join request:`, error);
    }
  }

  async loadOrderStatistics() {
    try {
      const response = await this.collectionService.getOrderStatistics();
      if (response && response.data && response.data.code === 1) {
        const stats = response.data.data;
        this.updateStatusFilterCounts(stats);
      }
    } catch (error) {
      console.error('Error loading order statistics:', error);
    }
  }

  async loadPendingReviewRequests() {
    try {
      const response = await this.collectionService.getPendingReviewRequests();
      if (response && response.data && response.data.code === 1) {
        this.pendingReviewRequests = response.data.data;
        console.log('Loaded pending review requests:', this.pendingReviewRequests);
      }
    } catch (error) {
      console.error('Error loading pending review requests:', error);
    }
  }

  async loadBookings() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      console.log('Loading bookings...');
      const response = await this.collectionService.getBookings();
      console.log('Bookings response:', response);
      
      if (response && response.data) {
        console.log('Response data:', response.data);
        
        let rawBookings: any[] = [];
        
        // Check if response.data is an array (direct API response)
        if (Array.isArray(response.data)) {
          console.log('Raw booking data from API (array format):', response.data);
          rawBookings = response.data;
        } 
        // Check if response.data has the expected code/data structure
        else if (response.data.code === 1) {
          console.log('Raw booking data from API (code/data format):', response.data.data);
          rawBookings = response.data.data;
        } else {
          console.error('API returned error code:', response.data.code);
          this.errorMessage = response.data.message || 'Failed to load bookings';
          return;
        }

        // Process bookings to handle multi-slot structure
        this.bookings = [];
        
        for (const booking of rawBookings) {
          console.log('Processing booking:', booking);
          console.log('Booking slots:', booking.slots);
          console.log('Booking teeInfo:', booking.teeInfo);
          console.log('Booking teeName:', booking.teeName);
          console.log('Booking booking_time:', booking.booking_time);
          console.log('Booking slotDate:', booking.slotDate);
          
          if (booking.slots && booking.slots.length > 0) {
            // Create a separate row for each slot
            for (let i = 0; i < booking.slots.length; i++) {
              const slot = booking.slots[i];
              const slotBooking = this.processSlotBooking(booking, slot, i);
              this.bookings.push(slotBooking);
            }
          } else {
            // Single slot or no slots - create single row
            const processedBooking = this.processSingleBooking(booking);
            this.bookings.push(processedBooking);
          }
        }
        
        // Now set the isIncomingRequest property for all bookings
        this.bookings.forEach(booking => {
          const isIncoming = this.isIncomingRequest(booking);
          booking.isIncomingRequest = isIncoming;
          console.log(`Setting isIncomingRequest for booking ${booking.id}:`, {
            is_join_request: booking.is_join_request,
            original_booking: booking.original_booking,
            isIncomingRequest: isIncoming
          });
          if (booking.isIncomingRequest) {
            booking.requesterName = this.getRequesterName(booking);
            booking.requesterEmail = this.getRequesterEmail(booking);
          }
        });

        // Load and merge join requests
        await this.loadAndMergeJoinRequests();
        
        this.updateStatusFilterCounts();
      } else {
        console.error('Invalid response format:', response);
        this.errorMessage = 'Invalid response from server';
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      this.errorMessage = 'Failed to load bookings. Please check your connection.';
    } finally {
      this.isLoading = false;
    }
  }

  // New method to load and merge join requests
  private async loadAndMergeJoinRequests() {
    try {
      // Load incoming join requests
      const incomingResponse = await this.collectionService.getIncomingJoinRequests();
      if (incomingResponse && incomingResponse.data && incomingResponse.data.code === 1) {
        this.incomingJoinRequests = incomingResponse.data.data;
        console.log('Loaded incoming join requests:', this.incomingJoinRequests);
        
        // Convert incoming join requests to booking format and add to bookings array
        for (const joinRequest of this.incomingJoinRequests) {
          const joinRequestBooking = this.convertJoinRequestToBooking(joinRequest);
          this.bookings.push(joinRequestBooking);
        }
      }

      // Load outgoing join requests
      const outgoingResponse = await this.collectionService.getOutgoingJoinRequests();
      if (outgoingResponse && outgoingResponse.data && outgoingResponse.data.code === 1) {
        this.outgoingJoinRequests = outgoingResponse.data.data;
        console.log('Loaded outgoing join requests:', this.outgoingJoinRequests);
        
        // Convert outgoing join requests to booking format and add to bookings array
        for (const joinRequest of this.outgoingJoinRequests) {
          const joinRequestBooking = this.convertJoinRequestToBooking(joinRequest);
          this.bookings.push(joinRequestBooking);
        }
      }
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  }



  private processSlotBooking(booking: any, slot: any, index: number): Booking {
    const slotBooking = {
      ...booking,
      id: `${booking.id}-slot-${index + 1}`, // Create unique ID for display
      originalBookingId: booking.id, // Keep reference to original booking
      slotIndex: index,
      // Override with slot-specific data
      tee: slot.tee,
      teeInfo: slot.teeInfo || `Tee ${slot.tee || 'Unknown'}`,
      teeName: slot.teeName || `Tee ${slot.tee || 'Unknown'}`,
      booking_time: slot.booking_time || 'Time not specified',
      participants: slot.participants,
      slot_status: slot.slot_status,
      slot_order: slot.slot_order,
      endTime: slot.endTime,
      slot_date: slot.slotDate || slot.slot_date, // Add slot date
      // Mark as multi-slot
      hasMultipleSlots: booking.slots.length > 1,
      isMultiSlotBooking: true,
      totalSlots: booking.slots.length,
      slotNumber: index + 1,
      // Format display data - use created_at as booked date
      formattedDate: this.formatDate(slot.created_at || slot.formatted_created_date || booking.bookingDate || booking.formattedDate),
      canJoinSlot: this.canJoinSlot(booking),
      // New order management fields
      isOwnBooking: !booking.is_join_request,
      canAddParticipants: this.canAddParticipants(booking, slot),
      maxParticipants: 4,
      isIncomingRequest: false, // Will be set after isOwnBooking is set
      requesterName: '',
      requesterEmail: ''
    };
    

    return slotBooking;
  }

  private processSingleBooking(booking: any): Booking {
    const processedBooking = {
      ...booking,
      // For single bookings, use the main booking data
      originalBookingId: booking.id, // Keep reference to original booking
      teeInfo: booking.teeInfo || `Tee ${booking.tee || 'Unknown'}`,
      teeName: booking.teeName || `Tee ${booking.tee || 'Unknown'}`,
      booking_time: booking.booking_time || booking.bookingTime || 'Time not specified',
      slot_date: booking.slotDate || booking.bookingDate,
      participants: booking.participants,
      formattedDate: this.formatDate(booking.createdAt || booking.bookingDate || booking.formattedDate),
      canJoinSlot: this.canJoinSlot(booking),
      hasMultipleSlots: false,
      isMultiSlotBooking: false,
      totalSlots: 1,
      slotNumber: 1,
      // New order management fields
      isOwnBooking: !booking.is_join_request,
      canAddParticipants: this.canAddParticipants(booking, null),
      maxParticipants: 4,
      isIncomingRequest: false, // Will be set after isOwnBooking is set
      requesterName: '',
      requesterEmail: ''
    };
    

    return processedBooking;
  }

  // New helper methods for order management
  private canAddParticipants(booking: any, slot: any): boolean {
    if (booking.is_join_request) return false;
    if (booking.status !== 'confirmed') return false;
    
    const currentParticipants = slot ? slot.participants : booking.participants;
    return currentParticipants < 4;
  }

  private isIncomingRequest(booking: any): boolean {
    // An incoming request is a join request that is NOT made by the current user
    // It's a request from another member to join the current user's slot
    if (!booking.is_join_request) {
      return false;
    }
    
    // For a join request to be "incoming", it means the current user should see accept/reject buttons
    // This happens when:
    // 1. It's a join request (is_join_request = true)
    // 2. The current user is NOT the one who made the join request (isOwnBooking = false)
    // 3. The current user owns the original booking that the join request is trying to join
    
    // Since we're viewing this in the orders component, if it's a join request and not owned by current user,
    // it means the current user should be able to approve/reject it
    return !booking.isOwnBooking;
  }

  private getRequesterName(booking: any): string {
    if (this.isIncomingRequest(booking)) {
      // For incoming requests, the requester is the member who made the join request
      return booking.memberName || 'Unknown Member';
    }
    return '';
  }

  private getRequesterEmail(booking: any): string {
    if (this.isIncomingRequest(booking)) {
      // For incoming requests, try to get email from member object or other fields
      return booking.member?.email || booking.email || '';
    }
    return '';
  }

  // Get original booker name for join requests
  getOriginalBookerName(booking: any): string {
    if (booking.originalBookingInfo) {
      return booking.originalBookingInfo.memberName || 'Unknown';
    }
    return 'Unknown';
  }

  // Get original booking participants count
  getOriginalBookingParticipants(booking: any): number {
    if (booking.originalBookingInfo) {
      return booking.originalBookingInfo.participants || 0;
    }
    return 0;
  }

  // Check if a request can be accepted
  canAcceptRequest(booking: any): boolean {
    if (!booking.isIncomingRequest || booking.status !== 'pending_approval') {
      return false;
    }
    
    // Check if there are available spots
    const currentParticipants = this.getOriginalBookingParticipants(booking);
    const requestedParticipants = booking.participants;
    const totalParticipants = currentParticipants + requestedParticipants;
    
    console.log('Checking if request can be accepted:', {
      currentParticipants,
      requestedParticipants,
      totalParticipants,
      maxAllowed: 4,
      canAccept: totalParticipants <= 4
    });
    
    return totalParticipants <= 4;
  }

  // Handle accept request
  async handleAcceptRequest(booking: any) {
    if (!this.canAcceptRequest(booking)) {
      return;
    }

    try {
      // For join requests, we need to use the original booking ID (the slot being joined)
      // and the join request ID (the request itself)
      const originalBookingId = booking.originalBookingInfo?.id || booking.original_booking;
      
      // The API expects a numeric ID for the join request, not the request_id string
      // We need to find the actual numeric ID from the booking data
      let joinRequestId = null;
      
      // Try to find the numeric ID from various possible fields
      if (booking.id && typeof booking.id === 'number') {
        joinRequestId = booking.id;
      } else if (booking.originalBookingId && typeof booking.originalBookingId === 'number') {
        joinRequestId = booking.originalBookingId;
      } else if (booking.original_booking && typeof booking.original_booking === 'number') {
        joinRequestId = booking.original_booking;
      }
      
      // If we still don't have a numeric ID, try to extract it from the string ID
      if (!joinRequestId && booking.id && typeof booking.id === 'string') {
        // Try to extract numeric part from string ID like "incoming_5"
        const numericMatch = booking.id.match(/\d+$/);
        if (numericMatch) {
          joinRequestId = parseInt(numericMatch[0]);
        }
      }
      
      console.log('Accepting join request:', {
        originalBookingId,
        joinRequestId,
        request_id: booking.request_id,
        booking_id: booking.booking_id,
        id: booking.id,
        type: typeof joinRequestId
      });
      
      if (!joinRequestId) {
        console.error('Could not find numeric join request ID');
        return;
      }
      
      const response = await this.collectionService.reviewJoinRequest(
        originalBookingId,
        joinRequestId,
        'approve'
      );
      
      if (response && response.data && response.data.code === 1) {
        // Success - reload data
        await this.refreshData();
      } else {
        console.error('Failed to accept join request:', response);
      }
    } catch (error) {
      console.error('Error accepting join request:', error);
    }
  }

  // Handle reject request
  async handleRejectRequest(booking: any) {
    try {
      // For join requests, we need to use the original booking ID (the slot being joined)
      // and the join request ID (the request itself)
      const originalBookingId = booking.originalBookingInfo?.id || booking.original_booking;
      
      // The API expects a numeric ID for the join request, not the request_id string
      // We need to find the actual numeric ID from the booking data
      let joinRequestId = null;
      
      // Try to find the numeric ID from various possible fields
      if (booking.id && typeof booking.id === 'number') {
        joinRequestId = booking.id;
      } else if (booking.originalBookingId && typeof booking.originalBookingId === 'number') {
        joinRequestId = booking.originalBookingId;
      } else if (booking.original_booking && typeof booking.original_booking === 'number') {
        joinRequestId = booking.original_booking;
      }
      
      // If we still don't have a numeric ID, try to extract it from the string ID
      if (!joinRequestId && booking.id && typeof booking.id === 'string') {
        // Try to extract numeric part from string ID like "incoming_5"
        const numericMatch = booking.id.match(/\d+$/);
        if (numericMatch) {
          joinRequestId = parseInt(numericMatch[0]);
        }
      }
      
      console.log('Rejecting join request:', {
        originalBookingId,
        joinRequestId,
        request_id: booking.request_id,
        booking_id: booking.booking_id,
        id: booking.id,
        type: typeof joinRequestId
      });
      
      if (!joinRequestId) {
        console.error('Could not find numeric join request ID');
        return;
      }
      
      const response = await this.collectionService.reviewJoinRequest(
        originalBookingId,
        joinRequestId,
        'reject'
      );
      
      if (response && response.data && response.data.code === 1) {
        // Success - reload data
        await this.refreshData();
      } else {
        console.error('Failed to reject join request:', response);
      }
    } catch (error) {
      console.error('Error rejecting join request:', error);
    }
  }

  async loadNotifications() {
    try {
      const response = await this.collectionService.getNotifications();
      console.log('Notifications response:', response);
      
      if (response && response.data) {
        // Check if response.data is an array (direct API response)
        if (Array.isArray(response.data)) {
          console.log('Raw notifications data from API (array format):', response.data);
          this.notifications = response.data;
        } 
        // Check if response.data has the expected code/data structure
        else if (response.data.code === 1) {
          console.log('Raw notifications data from API (code/data format):', response.data.data);
          this.notifications = response.data.data;
        } else {
          console.error('Failed to load notifications:', response);
        }
      } else {
        console.error('Invalid notifications response:', response);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async loadUnreadCount() {
    try {
      const response = await this.collectionService.getUnreadNotificationCount();
      console.log('Unread count response:', response);
      
      if (response && response.data) {
        // Check if response.data has the expected code/data structure
        if (response.data.code === 1) {
          this.unreadCount = response.data.data.unread_count;
        } 
        // Check if response.data is a direct number or object
        else if (typeof response.data === 'number') {
          this.unreadCount = response.data;
        } else if (response.data.unread_count !== undefined) {
          this.unreadCount = response.data.unread_count;
        } else {
          console.error('Failed to load unread count:', response);
        }
      } else {
        console.error('Invalid unread count response:', response);
      }
    } catch (error) {
      console.error('Error loading unread notification count:', error);
    }
  }

  // Update status filter counts
  private updateStatusFilterCounts(stats?: OrderStatistics) {
    if (stats) {
      this.statusFilters.forEach(filter => {
        if (filter.value === 'all') {
          filter.count = stats.total;
        } else {
          filter.count = stats[filter.value as keyof OrderStatistics] || 0;
        }
      });
    } else {
      this.statusFilters.forEach(filter => {
        if (filter.value === 'all') {
          filter.count = this.bookings.length;
        } else {
          filter.count = this.bookings.filter(booking => booking.status === filter.value).length;
        }
      });
    }
  }



  // Get booking statistics
  getBookingStatistics() {
    const totalBookings = this.bookings.length;
    const confirmed = this.bookings.filter(b => b.status === 'confirmed').length;
    const pendingRequests = this.bookings.filter(b => b.status === 'pending_approval').length;
    const requestsAccepted = this.bookings.filter(b => b.status === 'approved').length;
    const acceptRejectActions = this.bookings.filter(b => 
      b.status === 'pending_approval' && b.is_join_request
    ).length;

    return {
      totalBookings,
      confirmed,
      pendingRequests,
      requestsAccepted,
      acceptRejectActions
    };
  }

  // Format date for display - consistent "27 Aug 25" format
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }



  // Check if slot can accept more participants
  canJoinSlot(booking: Booking): boolean {
    // Only allow joining slots that are not full and are confirmed
    return booking.status === 'confirmed' && 
           !(booking.isSlotFull ?? false) && 
           (booking.canAcceptMoreParticipants ?? false);
  }

  // Get action text for booking
  getActionText(booking: Booking): string {
    if (booking.status === 'confirmed' && !booking.isSlotFull && booking.canAcceptMoreParticipants) {
      return 'Add Participants';
    }
    return 'View Details';
  }

  // Get action icon for booking
  getActionIcon(booking: Booking): any {
    if (booking.status === 'confirmed' && !booking.isSlotFull && booking.canAcceptMoreParticipants) {
      return this.plusIcon;
    }
    return this.eyeIcon;
  }

  // Handle action button click
  handleActionClick(booking: Booking) {
    if (booking.status === 'confirmed' && !booking.isSlotFull && booking.canAcceptMoreParticipants) {
      this.openParticipantModal(booking);
    } else {
      this.viewBookingDetails(booking);
    }
  }



  // Close booking details
  closeBookingDetails() {
    this.showBookingDetails = false;
    this.selectedBooking = null;
  }

  // Open participant modal
  openParticipantModal(booking: Booking) {
    this.selectedBookingForParticipants = booking;
    this.requestedParticipants = 1;
    this.showParticipantModal = true;
  }

  // Close participant modal
  closeParticipantModal() {
    this.showParticipantModal = false;
    this.selectedBookingForParticipants = null;
    this.requestedParticipants = 1;
  }

  // Increment participants
  incrementParticipants() {
    if (this.selectedBookingForParticipants) {
      const maxAllowed = Math.min(
        this.selectedBookingForParticipants.availableSpots || 4, 
        4
      );
      if (this.requestedParticipants < maxAllowed) {
        this.requestedParticipants++;
      }
    }
  }

  // Decrement participants
  decrementParticipants() {
    if (this.requestedParticipants > 1) {
      this.requestedParticipants--;
    }
  }

  // Confirm adding participants
  async confirmAddParticipants() {
    if (!this.selectedBookingForParticipants) return;

    try {
      // Use the original booking ID, not the slot-based ID
      const bookingId = this.selectedBookingForParticipants.originalBookingId || this.selectedBookingForParticipants.id;
      
      console.log('Adding participants to booking:', {
        displayId: this.selectedBookingForParticipants.id,
        originalBookingId: this.selectedBookingForParticipants.originalBookingId,
        finalBookingId: bookingId,
        requestedParticipants: this.requestedParticipants,
        fullBookingObject: this.selectedBookingForParticipants
      });
      
      // Call API to add participants
      const response = await this.collectionService.addParticipants(
        bookingId,
        this.requestedParticipants
      );
      
      if (response && response.data && response.data.code === 1) {
        // Success - close modal and reload data
        this.closeParticipantModal();
        await this.refreshData();
      } else {
        console.error('Failed to add participants:', response);
        // Handle error - could show toast message
      }
    } catch (error) {
      console.error('Error adding participants:', error);
      // Handle error - could show toast message
    }
  }

  // New methods for order management
  openReviewRequestModal(booking: Booking) {
    // Convert Booking to JoinRequest format for the modal
    const joinRequest: JoinRequest = {
      id: booking.id,
      originalBookingId: booking.originalBookingId || 0,
      memberName: booking.memberName,
      courseName: booking.courseName,
      tee: booking.tee || 0,
      teeInfo: booking.teeInfo || '',
      teeName: booking.teeName || '',
      bookingDate: booking.bookingDate || '',
      bookingTime: booking.booking_time || '',
      participants: booking.participants,
      status: booking.status,
      totalParticipantsIfApproved: (booking.participants || 0) + (this.getOriginalBookingParticipants(booking) || 0),
      createdAt: booking.createdAt || '',
      formattedCreatedDate: this.formatDate(booking.createdAt || '')
    };
    
    this.selectedJoinRequest = joinRequest;
    this.reviewAction = 'approve';
    this.showJoinRequestModal = true;
  }



  // Pending review modal methods
  openPendingReviewModal() {
    this.showPendingReviewModal = true;
  }

  closePendingReviewModal() {
    this.showPendingReviewModal = false;
  }

  async handlePendingReviewAction(request: any, action: 'approve' | 'reject') {
    try {
      const response = await this.collectionService.reviewJoinRequest(
        request.originalBookingId,
        request.id,
        action
      );
      
      if (response && response.data && response.data.code === 1) {
        // Success - close modal and reload data
        this.closePendingReviewModal();
        await this.refreshData();
      } else {
        console.error(`Failed to ${action} join request:`, response);
      }
    } catch (error) {
        console.error(`Error ${action}ing join request:`, error);
    }
  }

  async confirmReviewRequest() {
    if (!this.selectedJoinRequest) return;

    try {
      // Use the original booking ID, not the slot-based ID
      const bookingId = this.selectedJoinRequest.originalBookingId || this.selectedJoinRequest.id;
      
      // Call API to review join request
      const response = await this.collectionService.reviewJoinRequest(
        this.selectedJoinRequest.id,
        this.reviewAction
      );
      
      if (response && response.data && response.data.code === 1) {
        // Success - close modal and reload data
        this.closeReviewRequestModal();
        await this.refreshData();
      } else {
        console.error('Failed to review join request:', response);
        // Handle error - could show toast message
      }
    } catch (error) {
      console.error('Error reviewing join request:', error);
      // Handle error - could show toast message
    }
  }

  // Enhanced action handling methods
  getActionButton(booking: Booking): any {
    // For join requests (outgoing), show only View Details
    if (booking.is_join_request && !booking.isIncomingRequest) {
      return {
        text: 'View Details',
        color: 'gray',
        action: 'viewDetails',
        enabled: true
      };
    }
    
    if (booking.status === 'confirmed') {
      if (booking.isOwnBooking && booking.canAddParticipants) {
        return {
          text: '+ Add Participants',
          color: 'green',
          action: 'addParticipants',
          enabled: true
        };
      }
      return {
        text: 'View Details',
        color: 'blue',
        action: 'viewDetails',
        enabled: true
      };
         } else if (booking.status === 'pending_approval') {
       if (booking.isIncomingRequest) {
         return {
           text: 'View Request',
           color: 'purple',
           action: 'viewDetails',
           enabled: true
         };
       }
       return {
         text: 'View Details',
         color: 'gray',
         action: 'viewDetails',
         enabled: true
       };
     }
    
    return {
      text: 'View Details',
      color: 'blue',
      action: 'viewDetails',
      enabled: true
    };
  }

     handleActionButtonClick(booking: Booking) {
     const actionButton = this.getActionButton(booking);
     
     switch (actionButton.action) {
       case 'addParticipants':
         this.openParticipantModal(booking);
         break;
       case 'viewDetails':
       default:
         this.viewBookingDetails(booking);
         break;
     }
   }

  // Get participant display text
  getParticipantDisplayText(booking: Booking): string {
    // For join requests, show participants as read-only
    if (booking.is_join_request && !booking.isIncomingRequest) {
      return `${booking.participants} player${booking.participants > 1 ? 's' : ''} (Request)`;
    }
    
    if (booking.status === 'confirmed') {
      // Check if this booking has approved join requests (merged participants)
      if (booking.allParticipantsInfo && booking.allParticipantsInfo.length > 1) {
        const totalParticipants = booking.allParticipantsInfo.reduce((sum, p) => sum + p.participants, 0);
        const spotsLeft = 4 - totalParticipants;
        return `${totalParticipants} players (${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left)`;
      } else if (booking.participants < 4) {
        const spotsLeft = 4 - booking.participants;
        return `${booking.participants} player${booking.participants > 1 ? 's' : ''} (${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left)`;
      } else {
        return `${booking.participants} players`;
      }
    }
    return `${booking.participants} player${booking.participants > 1 ? 's' : ''}`;
  }

  // Get status badge class
  getStatusBadgeClass(booking: Booking): string {
    switch (booking.status) {
      case 'confirmed':
        return 'badge-success';
      case 'pending_approval':
        if (booking.isIncomingRequest) {
          return 'badge-warning';
        }
        return 'badge-info';
      case 'approved':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  }

     // Get status display text with context
   getStatusDisplayText(booking: Booking): string {
     switch (booking.status) {
       case 'confirmed':
         return 'CONFIRMED';
       case 'pending_approval':
         if (booking.isIncomingRequest) {
           return 'JOIN REQUEST';
         }
         return 'PENDING REQUEST';
       case 'approved':
         return 'CONFIRMED';
       default:
         return booking.status.toUpperCase();
     }
   }

  // Check if booking is empty state
  isEmptyState(): boolean {
    return this.bookings.length === 0;
  }

  // Navigate to tee booking
  navigateToTeeBooking() {
    this.router.navigate(['/collection']);
  }

  // Handle notification click
  handleNotificationClick(notificationId: number) {
    // Mark notification as read
    this.markNotificationAsRead(notificationId);
    
    // Find the related booking
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && notification.related_booking) {
      // Highlight the related booking (could scroll to it or show details)
      const relatedBooking = this.bookings.find(b => b.id === notification.related_booking);
      if (relatedBooking) {
        this.viewBookingDetails(relatedBooking);
      }
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number) {
    try {
      await this.collectionService.markNotificationAsRead(notificationId);
      
      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.is_read = true;
      }
      
      // Reload unread count
      await this.loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Get status class for styling
  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'approved':
        return 'status-approved';
      case 'pending_approval':
        return 'status-pending';
      default:
        return 'status-default';
    }
  }

  // Get status display text
  getStatusText(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'approved':
        return 'Approved';
      case 'pending_approval':
        return 'Pending Approval';
      default:
        return status;
    }
  }

  // Filter change handler
  onStatusFilterChange(filterValue: string) {
    this.selectedStatusFilter = filterValue;
  }



  // Statistics methods for dashboard
  getTotalBookings(): number {
    return this.bookings.length;
  }

  getConfirmedBookings(): number {
    return this.bookings.filter(booking => booking.status === 'confirmed').length;
  }

  getPendingBookings(): number {
    return this.bookings.filter(booking => booking.status === 'pending_approval').length;
  }

  getJoinRequests(): number {
    return this.bookings.filter(booking => booking.is_join_request).length;
  }

  // Get count of received requests (incoming join requests)
  getReceivedRequestsCount(): number {
    return this.bookings.filter(booking => 
      booking.isIncomingRequest && booking.status === 'pending_approval'
    ).length;
  }

  // Get count of rejected requests
  getRejectedRequestsCount(): number {
    return this.bookings.filter(booking => 
      booking.isIncomingRequest && booking.status === 'rejected'
    ).length;
  }

  getGroupedBookings(): Booking[] {
    // For now, return all bookings as individual rows
    // This can be enhanced later to group by booking ID if needed
    return this.bookings;
  }

  // Enhanced Join Request Management Methods
  async loadIncomingJoinRequests() {
    try {
      const response = await this.collectionService.getIncomingJoinRequests();
      if (response && response.data && response.data.code === 1) {
        this.incomingJoinRequests = response.data.data;
        console.log('Loaded incoming join requests:', this.incomingJoinRequests);
      }
    } catch (error) {
      console.error('Error loading incoming join requests:', error);
    }
  }

  async loadOutgoingJoinRequests() {
    try {
      const response = await this.collectionService.getOutgoingJoinRequests();
      if (response && response.data && response.data.code === 1) {
        this.outgoingJoinRequests = response.data.data;
        console.log('Loaded outgoing join requests:', this.outgoingJoinRequests);
      }
    } catch (error) {
      console.error('Error loading outgoing join requests:', error);
    }
  }

  async loadJoinRequestStatistics() {
    try {
      const response = await this.collectionService.getJoinRequestStatistics();
      if (response && response.data && response.data.code === 1) {
        this.joinRequestStatistics = response.data.data;
        console.log('Loaded join request statistics:', this.joinRequestStatistics);
      }
    } catch (error) {
      console.error('Error loading join request statistics:', error);
    }
  }

  // Enhanced order statistics with join request counts
  async loadEnhancedOrderStatistics() {
    try {
      const response = await this.collectionService.getEnhancedOrderStatistics();
      if (response && response.data && response.data.code === 1) {
        this.enhancedStatistics = response.data.data;
        console.log('Loaded enhanced order statistics:', this.enhancedStatistics);
      }
    } catch (error) {
      console.error('Error loading enhanced order statistics:', error);
    }
  }

  // Show join request modal
  showJoinRequestDetails(joinRequest: JoinRequest) {
    this.selectedJoinRequest = joinRequest;
    this.showJoinRequestModal = true;
  }

  // Close join request modal
  closeJoinRequestModal() {
    this.showJoinRequestModal = false;
    this.selectedJoinRequest = null;
  }

  // Set action for join request (approve/reject)
  setJoinRequestAction(action: 'approve' | 'reject') {
    this.joinRequestAction = action;
  }





  // Handle join request action
  async handleJoinRequestAction() {
    if (!this.selectedJoinRequest) return;
    
    if (this.joinRequestAction === 'approve') {
      await this.approveJoinRequest(this.selectedJoinRequest);
    } else {
      await this.rejectJoinRequest(this.selectedJoinRequest);
    }
  }

  // Get formatted date for display
  getFormattedDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  // Get formatted time for display
  getFormattedTime(timeString: string): string {
    try {
      const date = new Date(`2000-01-01T${timeString}`);
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      return timeString;
    }
  }

  // Check if join request can be approved
  canApproveJoinRequest(joinRequest: JoinRequest): boolean {
    return joinRequest.status === 'pending_approval' && 
           joinRequest.totalParticipantsIfApproved <= 4;
  }

  // Check if join request can be rejected
  canRejectJoinRequest(joinRequest: JoinRequest): boolean {
    return joinRequest.status === 'pending_approval';
  }

  // Get status badge class for join requests
  getJoinRequestStatusClass(status: string): string {
    switch (status) {
      case 'pending_approval':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-default';
    }
  }

  // Get status display text for join requests
  getJoinRequestStatusText(status: string): string {
    switch (status) {
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }
}
