// Initialize Supabase client
const supabaseUrl = 'https://zgkvnervcankwdengvpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpna3ZuZXJ2Y2Fua3dkZW5ndnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzODczMDYsImV4cCI6MjA1MTk2MzMwNn0.O-Zis9DjH16hg-J6oCO8RXl7EDxpRhT9KqNJ_XukpY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

class InventoryView {
    constructor() {
        this.inventoryTable = document.getElementById('inventoryTable');
        this.searchInput = document.getElementById('searchInventory');
        this.filterSelect = document.getElementById('filterInventory');
        this.locationFilter = document.getElementById('locationFilter');
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

        // Load locations for staff view
        if (this.userRole === 'staff' && this.locationFilter) {
            await this.loadLocations();
        }

        await this.loadInventory();
        this.setupRealtimeSubscription();
    }

    setupEventListeners() {
        // Search functionality
        this.searchInput.addEventListener('input', () => {
            this.loadInventory();
        });

        // Filter functionality
        this.filterSelect.addEventListener('change', () => {
            this.loadInventory();
        });

        // Location filter for staff
        if (this.locationFilter) {
            this.locationFilter.addEventListener('change', () => {
                this.loadInventory();
            });
        }

        // Logout handler
        document.getElementById('logout').addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = '/index.html';
            }
        });
    }

    async loadLocations() {
        const { data, error } = await supabase
            .from('inventory')
            .select('item_location')
            .not('item_location', 'is', null);

        if (error) {
            console.error('Error loading locations:', error.message);
            return;
        }

        // Get unique locations
        const locations = [...new Set(data.map(item => item.item_location))];
        
        // Populate location filter
        this.locationFilter.innerHTML = '<option value="all">All Locations</option>' +
            locations.map(location => 
                `<option value="${location}">${location}</option>`
            ).join('');
    }

    async loadInventory() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const filter = this.filterSelect.value;
        const location = this.locationFilter ? this.locationFilter.value : 'all';

        let query = supabase
            .from('inventory')
            .select('*')
            .order('arrive_date', { ascending: true });
        //    .order('created_at', { ascending: false });

        if (searchTerm) {
            query = query.or(`item_name.ilike.%${searchTerm}%,code_colour.ilike.%${searchTerm}%`);
        }

        if (filter !== 'all') {
            query = query.eq('item_group', filter);
        }

        if (location !== 'all') {
            query = query.eq('item_location', location);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading inventory:', error.message);
            return;
        }

        this.renderInventoryTable(data);
    }

    renderInventoryTable(data) {
        const tableBody = this.inventoryTable.querySelector('tbody');
        tableBody.innerHTML = '';

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.code_colour}</td>
                <td>${item.item_name}</td>
                <td>${item.item_group}</td>
                ${this.userRole === 'staff' ? `<td>${item.item_location || 'N/A'}</td>` : ''}
                <td>${item.stock_qty}</td>
                <td class="status-${this.getStatusClass(item.item_status)}">${item.item_status}</td>
                <td>
                    <button onclick="inventoryView.viewDetails('${item.id}')">View Details</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    getStatusClass(status) {
        switch (status?.toLowerCase()) {
            case 'out of stock':
                return 'out';
            case 'low stock':
                return 'low';
            case 'in stock':
                return 'in';
            default:
                return '';
        }
    }

    async viewDetails(id) {
        const { data: item, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching item details:', error.message);
            return;
        }

        // Populate modal with item details
        document.getElementById('detailCode').textContent = item.code_colour;
        document.getElementById('detailName').textContent = item.item_name;
        document.getElementById('detailGroup').textContent = item.item_group;
        document.getElementById('detailStock').textContent = item.stock_qty;
        document.getElementById('detailPackUnit').textContent = item.pack_unit;
        document.getElementById('detailLocation').textContent = item.item_location || 'N/A';
        document.getElementById('detailStatus').textContent = item.item_status;
        document.getElementById('detailReleaseDate').textContent = item.release_date ? 
            new Date(item.release_date).toLocaleDateString() : 'N/A';
        document.getElementById('detailAging').textContent = item.item_aging || 'N/A';
        document.getElementById('detailStatus').textContent = item.item_cargo;

        if (this.userRole === 'staff') {
            document.getElementById('detailMfgDate').textContent = item.mfg_date ? 
                new Date(item.mfg_date).toLocaleDateString() : 'N/A';
            document.getElementById('detailNotes').textContent = item.item_note || 'No notes';
        }

        // Show modal
        document.getElementById('detailsModal').style.display = 'block';
    }

    setupRealtimeSubscription() {
        supabase
            .channel('inventory_changes')
            .on('postgres_changes', 
                {
                    event: '*',
                    schema: 'public',
                    table: 'inventory'
                },
                () => {
                    this.loadInventory();
                }
            )
            .subscribe();
    }
}

// Initialize the inventory view when the DOM is loaded
let inventoryView;
document.addEventListener('DOMContentLoaded', () => {
    inventoryView = new InventoryView();
});
