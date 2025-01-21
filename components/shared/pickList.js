class PickList {
    constructor() {
        this.printStyles = `
            @media print {
                body * {
                    visibility: hidden;
                }
                #printArea, #printArea * {
                    visibility: visible;
                }
                #printArea {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                .no-print {
                    display: none !important;
                }
            }
        `;
    }

    generatePickList(order) {
        const printArea = document.createElement('div');
        printArea.id = 'printArea';
        
        const header = this.createHeader(order);
        const itemsList = this.createItemsList(order);
        const summary = this.createSummary(order);
        
        printArea.appendChild(header);
        printArea.appendChild(itemsList);
        printArea.appendChild(summary);
        
        return printArea;
    }

    createHeader(order) {
        const header = document.createElement('div');
        header.className = 'pick-list-header';
        header.innerHTML = `
            <h1>${order.order_type.toUpperCase()} ORDER PICK LIST</h1>
            <div class="order-info">
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Invoice No:</strong> ${order.invoice_no || 'N/A'}</p>
                <p><strong>Customer:</strong> ${order.customer_name}</p>
                <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${order.status}</p>
            </div>
        `;
        return header;
    }

    createItemsList(order) {
        const itemsList = document.createElement('div');
        itemsList.className = 'pick-list-items';
        
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Item Code</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th class="no-print">Picked</th>
                </tr>
            </thead>
            <tbody>
                ${order.orderItems.map(item => `
                    <tr>
                        <td>${item.itemCode}</td>
                        <td>${item.inventory.Code_Colour}</td>
                        <td>${item.inventory.Location || 'N/A'}</td>
                        <td>${item.iPack}</td>
                        <td>${item.iStatus}</td>
                        <td class="no-print">
                            <input type="checkbox" class="pick-checkbox">
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        itemsList.appendChild(table);
        return itemsList;
    }

    createSummary(order) {
        const summary = document.createElement('div');
        summary.className = 'pick-list-summary';
        summary.innerHTML = `
            <div class="summary-info">
                <p><strong>Total Items:</strong> ${order.totalItems}</p>
                <p><strong>Agent State:</strong> ${order.agentState || 'N/A'}</p>
                <p><strong>Notes:</strong> ${order.orderNote || 'No notes'}</p>
            </div>
            <div class="signatures no-print">
                <div class="signature-line">
                    <p>Picked by: _________________</p>
                    <p>Date: _________________</p>
                </div>
                <div class="signature-line">
                    <p>Checked by: _________________</p>
                    <p>Date: _________________</p>
                </div>
            </div>
        `;
        return summary;
    }

    print(order) {
        // Add print styles
        const style = document.createElement('style');
        style.textContent = this.printStyles;
        document.head.appendChild(style);

        // Create and append pick list
        const pickList = this.generatePickList(order);
        document.body.appendChild(pickList);

        // Print and cleanup
        window.print();
        document.body.removeChild(pickList);
        document.head.removeChild(style);
    }
}
