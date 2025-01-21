// Initialize Supabase client
const supabaseUrl = 'https://zgkvnervcankwdengvpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3ZuZXJ2Y2Fua3dkZW5ndnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzODczMDYsImV4cCI6MjA1MTk2MzMwNn0.O-Zis9DjH16hg-J6oCO8RXl7EDxpRhT9KqNJ_XukpY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

class OrderView {
    constructor() {
        this.orderTable = document.getElementById('orderTable');
        this.searchInput = document.getElementById('searchOrder');
        this.filterSelect = document.getElementById('filterOrder');
        this.userRole = '';
        this.userEmail = '';
        
        this.initialize();
        this.setupEventListeners();
    }

    async initialize() {
        // Get current user and role
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error('Error getting user:', userError.message);
            window.location.href = '/index.html';
            return;
        }

        const { data: userData, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('email', user.email)
            .single();

        if (roleError) {
            console.error('Error getting user role:', roleError.message);
            return;
        }

        this.userRole = userData.role;
        this.userEmail = user.email;
        document.getElementById('userEmail').textContent = this.userEmail;

        await this.loadOrders();
        this.setupRealtimeSubscription();
    }

    setupEventListeners() {
        // Search functionality
        this.searchInput.addEventListener('input', () => {
            this.loadOrders();
        });

        // Filter functionality
        this.filterSelect.addEventListener('change', () => {
            this.loadOrders();
        });

        // Logout handler
        document.getElementById('logout').addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = '/index.html';
            }
        });

        // Print handler
        document.getElementById('printOrder').addEventListener('click', () => {
            window.print();
        });
    }

    async loadOrders() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const filter = this.filterSelect.value;

        let query = supabase
            .from('orders')
            .select(`
                *,
                orderItemss (
                    *,
                    inventory (Code_Colour)
                )
            `)
            .order('Created', { ascending: false });

        if (searchTerm) {
            query = query.or(`customerName.ilike.%${searchTerm}%,invoiceNo.ilike.%${searchTerm}%`);
        }

        if (filter !== 'all') {
            query = query.eq('ooStatus', filter);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading orders:', error.message);
            return;
        }

        this.renderOrderTable(data);
    }

    renderOrderTable(data) {
        const tableBody = this.orderTable.querySelector('tbody');
        tableBody.innerHTML = '';

        data.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.invoiceNo || 'N/A'}</td>
                <td>${order.customerName}</td>
                <td>${order.orderPPO}</td>
                <td class="oStatus-${order.ooStatus}">${order.oStatus}</td>
                <td>${order.total_items}</td>
                <td>${new Date(order.Created).toLocaleString()}</td>
                <td>
                    <button onclick="orderView.viewOrderDetails('${order.id}')">View Details</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async viewOrderDetails(orderId) {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                orderItems (
                    *,
                    inventory (Code_Colour)
                )
            `)
            .eq('id', orderId)
            .single();

        if (error) {
            console.error('Error fetching order details:', error.message);
            return;
        }

        // Populate order details
        document.getElementById('detailInvoice').textContent = order.invoiceNo || 'N/A';
        document.getElementById('detailCustomer').textContent = order.customerName;
        document.getElementById('detailoStatus').textContent = order.oStatus;
        document.getElementById('detailCreated').textContent = new Date(order.Created).toLocaleString();
        document.getElementById('detailCarrier').textContent = order.Courier || 'N/A';
        document.getElementById('detailTracking').textContent = order.TrackingNo || 'N/A';

        // Populate order items
        const itemsContainer = document.getElementById('detailItems');
        itemsContainer.innerHTML = order.orderItems.map(item => `
            <div class="order-item">
                <span>${item.inventory.Code_Colour}</span>
                <span>Quantity: ${item.iUnit}</span>
                <span>oStatus: ${item.iStatus}</span>
            </div>
        `).join('');

        // Populate notes
        document.getElementById('detailNotes').textContent = order.orderNote || 'No notes';

        // Show modal
        document.getElementById('orderDetailsModal').style.display = 'block';
    }

    setupRealtimeSubscription() {
        supabase
            .channel('order_changes')
            .on('postgres_changes', 
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders'
                },
                () => {
                    this.loadOrders();
                }
            )
            .subscribe();

        supabase
            .channel('orderItems_changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orderItems'
                },
                () => {
                    this.loadOrders();
                }
            )
            .subscribe();
    }
}

// Initialize the order view when the DOM is loaded
let orderView;
document.addEventListener('DOMContentLoaded', () => {
    orderView = new OrderView();
});
