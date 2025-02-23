class EditOrder {
    constructor() {
        this.wholesaleOrder = new WholesaleOrder();
        this.odmOrder = new OdmOrder();
    }

    async getOrder(orderId) {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    inventory (*)
                )
            `)
            .eq('id', orderId)
            .single();

        if (error) {
            throw new Error('Error fetching order: ' + error.message);
        }

        return order;
    }

    async updateOrder(orderId, formData) {
        const updates = {
            customer_name: formData.get('customer_name'),
            agent_state: formData.get('agent_state'),
            status: formData.get('status'),
            dispatched_carrier: formData.get('dispatched_carrier'),
            tracking_no: formData.get('tracking_no'),
            order_note: formData.get('order_note'),
            updated_at: new Date().toISOString()
        };

        // Add status-specific timestamps
        if (updates.status === 'completed' && formData.get('dispatched_at')) {
            updates.dispatched_at = formData.get('dispatched_at');
        } else if (updates.status === 'cancelled') {
            updates.cancelled_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', orderId)
            .select()
            .single();

        if (error) {
            throw new Error('Error updating order: ' + error.message);
        }

        // Update order items status if order is cancelled
        if (updates.status === 'cancelled') {
            await this.updateOrderItemsStatus(orderId, 'cancelled');
        }

        return data;
    }

    async addOrderItem(orderId, itemData) {
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('order_type')
            .eq('id', orderId)
            .single();

        if (orderError) {
            throw new Error('Error fetching order type: ' + orderError.message);
        }

        // Use appropriate order handler based on order type
        if (order.order_type === 'wholesale') {
            await this.wholesaleOrder.addOrderItem(orderId, itemData);
        } else if (order.order_type === 'odm') {
            await this.odmOrder.addOrderItem(orderId, itemData);
        } else {
            // Handle retail orders
            await this.addRetailOrderItem(orderId, itemData);
        }

        // Update total items count
        await this.updateOrderTotalItems(orderId);
    }

    async addRetailOrderItem(orderId, itemData) {
        // Get item details to verify stock
        const { data: item, error: itemError } = await supabase
            .from('inventory')
            .select('stock_qty')
            .eq('code_colour', itemData.item_name)
            .single();

        if (itemError) {
            throw new Error('Error fetching item details: ' + itemError.message);
        }

        // Check stock availability
        if (item.stock_qty < itemData.order_qty) {
            throw new Error('Insufficient stock available');
        }

        // Add order item
        const { error: orderItemError } = await supabase
            .from('order_items')
            .insert([{
                order_id: orderId,
                item_name: itemData.item_name,
                order_qty: itemData.order_qty,
                order_item_status: 'active'
            }]);

        if (orderItemError) {
            throw new Error('Error adding order item: ' + orderItemError.message);
        }
    }

    async removeOrderItem(orderId, itemId) {
        const { error } = await supabase
            .from('order_items')
            .delete()
            .eq('id', itemId)
            .eq('order_id', orderId);

        if (error) {
            throw new Error('Error removing order item: ' + error.message);
        }

        // Update total items count
        await this.updateOrderTotalItems(orderId);
    }

    async updateOrderItemsStatus(orderId, status) {
        const { error } = await supabase
            .from('order_items')
            .update({ order_item_status: status })
            .eq('order_id', orderId);

        if (error) {
            throw new Error('Error updating order items status: ' + error.message);
        }
    }

    async updateOrderTotalItems(orderId) {
        // Get total quantity of all items in the order
        const { data, error: countError } = await supabase
            .from('order_items')
            .select('order_qty')
            .eq('order_id', orderId);

        if (countError) {
            throw new Error('Error counting order items: ' + countError.message);
        }

        const totalItems = data.reduce((sum, item) => sum + item.order_qty, 0);

        // Update order with new total
        const { error: updateError } = await supabase
            .from('orders')
            .update({ total_items: totalItems })
            .eq('id', orderId);

        if (updateError) {
            throw new Error('Error updating order total: ' + updateError.message);
        }
    }

    generateEditForm(order) {
        return `
            <form id="editOrderForm" class="order-form">
                <div class="form-group">
                    <label for="customer_name">Customer Name*</label>
                    <input maxlength="30" type="text" name="customer_name" value="${order.customer_name}" required>
                </div>
                <div class="form-group">
                    <label for="agent_state">Agent State</label>
                    <input type="text" name="agent_state" value="${order.agent_state || ''}">
                </div>
                <div class="form-group">
                    <label for="status">Status*</label>
                    <select name="status" required>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
                <div class="shipping-info" ${order.status !== 'completed' ? 'style="display: none;"' : ''}>
                    <div class="form-group">
                        <label for="dispatched_carrier">Dispatch Carrier</label>
                        <input maxlength="20" type="text" name="dispatched_carrier" value="${order.dispatched_carrier || ''}">
                    </div>
                    <div class="form-group">
                        <label for="tracking_no">Tracking Number</label>
                        <input type="text" name="tracking_no" value="${order.tracking_no || ''}">
                    </div>
                    <div class="form-group">
                        <label for="dispatched_at">Dispatch Date</label>
                        <input type="datetime-local" name="dispatched_at" 
                            value="${order.dispatched_at ? new Date(order.dispatched_at).toISOString().slice(0, 16) : ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="order_note">Order Note</label>
                    <textarea maxlength="50" name="order_note">${order.order_note || ''}</textarea>
                </div>
                <button type="submit">Update Order</button>
            </form>
        `;
    }

    generateAddItemForm(order) {
        return `
            <form id="addOrderItemForm" class="order-item-form">
                <div class="form-group">
                    <label for="item_name">Item Code/Colour*</label>
                    <input maxlength="20" type="text" name="item_name" required>
                </div>
                <div class="form-group">
                    <label for="order_qty">Quantity*</label>
                    <input maxlength="3" type="number" name="order_qty" min="1" required>
                </div>
                <button type="submit">Add Item</button>
            </form>
        `;
    }
}
