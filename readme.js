document.addEventListener("DOMContentLoaded", function () {
  // Navigation functionality
  const navButtons = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".content-section");

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and sections
      navButtons.forEach((btn) => btn.classList.remove("active"));
      sections.forEach((section) => section.classList.remove("active"));

      // Add active class to clicked button and corresponding section
      button.classList.add("active");
      const sectionId = button.dataset.section;
      document.getElementById(sectionId).classList.add("active");
    });
  });

  // Table definitions
  const tables = {
    inventory: {
      name: "Inventory",
      fields: [
        { name: "id", type: "bigint", isPrimary: true, isRequired: true },
        { name: "code & colour", type: "text", isRequired: true },
        { name: "item name", type: "text" },
        { name: "location", type: "text" },
        { name: "qty", type: "real" },
        { name: "inventory", type: "real" },
        { name: "released", type: "timestamp with time zone" },
        { name: "aging", type: "text" },
        { name: "status", type: "text" },
        { name: "unit", type: "smallint" },
        { name: "size/pack", type: "text" },
        { name: "catagory", type: "text" },
        { name: "repeated", type: "boolean" },
        { name: "ppo", type: "text" },
        { name: "mfg-d", type: "timestamp with time zone" },
        { name: "cargo", type: "text" },
        { name: "schedule-d", type: "timestamp with time zone" },
        { name: "arrive-d", type: "timestamp with time zone" },
        { name: "note", type: "text" },
        { name: "soldout_date", type: "timestamp with time zone" },
        { name: "soldout_status", type: "text" },
      ],
      relationships: [
        { type: "hasMany", table: "order_items", via: "code & colour" },
      ],
    },
    users: {
      name: "Users",
      fields: [
        { name: "id", type: "bigint", isPrimary: true, isRequired: true },
        { name: "email", type: "text", isRequired: true },
        { name: "role", type: "text", isRequired: true },
      ],
    },
    order_header: {
      name: "Order Header",
      fields: [
        {
          name: "order_id",
          type: "integer",
          isPrimary: true,
          isRequired: true,
        },
        {
          name: "order_date",
          type: "timestamp with time zone",
          isRequired: true,
        },
        { name: "customer_name", type: "text", isRequired: true },
        { name: "agent_state", type: "text", isRequired: true },
        { name: "total_items", type: "integer", isRequired: true },
        { name: "created_at", type: "timestamp with time zone" },
        { name: "updated_at", type: "timestamp with time zone" },
        { name: "is_cancelled", type: "boolean" },
        { name: "cancel_date", type: "date" },
        { name: "status", type: "varchar" },
        { name: "dispatch_time", type: "timestamp with time zone" },
        { name: "dispatch_state", type: "varchar" },
        { name: "note", type: "text" },
      ],
      relationships: [
        { type: "hasMany", table: "order_items", via: "order_id" },
        { type: "hasMany", table: "order_item_history", via: "order_id" },
      ],
    },
    order_items: {
      name: "Order Items",
      fields: [
        { name: "item_id", type: "integer", isPrimary: true, isRequired: true },
        {
          name: "order_id",
          type: "integer",
          isForeign: true,
          isRequired: true,
        },
        { name: "code_colour", type: "text", isForeign: true },
        { name: "item_name", type: "text" },
        { name: "location", type: "text" },
        { name: "unit_per_pack", type: "numeric" },
        { name: "order_quantity", type: "integer", isRequired: true },
        { name: "total_pieces", type: "integer", isRequired: true },
        { name: "inventory_before", type: "numeric" },
        { name: "inventory_after", type: "numeric" },
        { name: "created_at", type: "timestamp with time zone" },
        { name: "completed_at", type: "timestamp with time zone" },
      ],
      relationships: [
        { type: "belongsTo", table: "order_header", via: "order_id" },
        { type: "belongsTo", table: "inventory", via: "code_colour" },
      ],
    },
    order_item_history: {
      name: "Order Item History",
      fields: [
        { name: "id", type: "bigint", isPrimary: true, isRequired: true },
        { name: "order_id", type: "bigint", isForeign: true },
        { name: "code_colour", type: "text" },
        { name: "item_name", type: "text" },
        { name: "order_quantity", type: "numeric" },
        { name: "unit_per_pack", type: "numeric" },
        { name: "total_pieces", type: "numeric" },
        { name: "location", type: "text" },
        { name: "inventory_before", type: "numeric" },
        { name: "action", type: "text" },
        { name: "action_date", type: "timestamp with time zone" },
        { name: "created_at", type: "timestamp with time zone" },
      ],
    },
    weekly_state_orders: {
      name: "Weekly State Orders",
      fields: [
        { name: "id", type: "integer", isPrimary: true, isRequired: true },
        { name: "week_start", type: "date", isRequired: true },
        { name: "week_end", type: "date", isRequired: true },
        { name: "qld_amount", type: "smallint" },
        { name: "nsw_amount", type: "smallint" },
        { name: "sa_amount", type: "smallint" },
        { name: "wa_amount", type: "smallint" },
        { name: "vic_amount", type: "smallint" },
        { name: "nz_amount", type: "smallint" },
        { name: "nt_amount", type: "smallint" },
        { name: "act_amount", type: "smallint" },
        { name: "others_amount", type: "smallint" },
        { name: "overall_total", type: "smallint" },
        { name: "paid_total", type: "smallint" },
        { name: "created_at", type: "timestamp with time zone" },
        { name: "updated_at", type: "timestamp with time zone" },
      ],
    },
    status_options: {
      name: "Status Options",
      fields: [
        { name: "id", type: "bigint", isPrimary: true, isRequired: true },
        { name: "status", type: "text" },
        {
          name: "created_at",
          type: "timestamp with time zone",
          isRequired: true,
        },
      ],
    },
    category_options: {
      name: "Category Options",
      fields: [
        { name: "id", type: "bigint", isPrimary: true, isRequired: true },
        { name: "category", type: "text" },
        {
          name: "created_at",
          type: "timestamp with time zone",
          isRequired: true,
        },
      ],
    },
    sizepack_options: {
      name: "Size/Pack Options",
      fields: [
        { name: "id", type: "bigint", isPrimary: true, isRequired: true },
        { name: "sizepack", type: "text" },
        {
          name: "created_at",
          type: "timestamp with time zone",
          isRequired: true,
        },
      ],
    },
    cargo_options: {
      name: "Cargo Options",
      fields: [
        { name: "id", type: "bigint", isPrimary: true, isRequired: true },
        { name: "cargo", type: "text" },
        {
          name: "created_at",
          type: "timestamp with time zone",
          isRequired: true,
        },
      ],
    },
    agent_state_options: {
      name: "Agent State Options",
      fields: [
        { name: "id", type: "bigint", isPrimary: true, isRequired: true },
        { name: "agent_state", type: "text" },
        {
          name: "created_at",
          type: "timestamp with time zone",
          isRequired: true,
        },
      ],
    },
  };

  // Handle menu item clicks
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      // Remove active class from all items
      menuItems.forEach((i) => i.classList.remove("active"));
      // Add active class to clicked item
      item.classList.add("active");
      // Display table content
      displayTableContent(item.dataset.table);
    });
  });

  function displayTableContent(tableName) {
    const table = tables[tableName];
    if (!table) {
      console.error(`Table ${tableName} not found in definitions`);
      return;
    }

    const tableContent = document.getElementById("tableContent");

    let html = `
      <div class="table-header">
        <h3>${table.name}</h3>
      </div>
      <div class="table-fields">
        <table>
          <thead>
            <tr>
              <th>Field Name</th>
              <th>Type</th>
              <th>Constraints</th>
            </tr>
          </thead>
          <tbody>
            ${table.fields
              .map(
                (field) => `
              <tr>
                <td class="field-name">
                  ${field.name}
                </td>
                <td class="field-type">
                  <span class="type-badge ${field.isPrimary ? "primary" : ""} ${
                  field.isForeign ? "foreign" : ""
                }">
                    ${field.type}
                  </span>
                </td>
                <td class="field-constraints">
                  ${
                    field.isPrimary
                      ? '<span class="constraint primary">Primary Key</span>'
                      : ""
                  }
                  ${
                    field.isForeign
                      ? '<span class="constraint foreign">Foreign Key</span>'
                      : ""
                  }
                  ${
                    field.isRequired
                      ? '<span class="constraint required">Required</span>'
                      : ""
                  }
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    tableContent.innerHTML = html;
  }

  // Display initial table content
  displayTableContent("inventory");
});
