import random
from datetime import datetime, timedelta

FIRST_NAMES = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ian", "Julia"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
CATEGORIES = ["Electronics", "Clothing", "Home & Kitchen", "Books", "Sports"]
PRODUCTS_DATA = [
    ("Wireless Earbuds", "Electronics", 49.99), ("Running Shoes", "Sports", 89.99),
    ("Coffee Maker", "Home & Kitchen", 39.99), ("Python Programming Book", "Books", 29.99),
    ("Smart Watch", "Electronics", 199.99), ("Yoga Mat", "Sports", 25.00),
    ("Blender", "Home & Kitchen", 55.00), ("Denim Jeans", "Clothing", 45.00)
]

def generate_ecommerce_sql():
    sql = ["SET FOREIGN_KEY_CHECKS = 0;\n"]
    
    # 1. Customers (500 records)
    sql.append("-- Customers")
    for i in range(1, 501):
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        email = f"{fn.lower()}.{ln.lower()}{random.randint(10,999)}@example.com"
        sql.append(f"INSERT INTO customers VALUES ({i}, '{fn}', '{ln}', '{email}', 'USA');")
        
    # 2. Products (8 records)
    sql.append("\n-- Products")
    for i, (p_name, cat, price) in enumerate(PRODUCTS_DATA, 1):
        sql.append(f"INSERT INTO products VALUES ({i}, '{p_name}', '{cat}', {price}, {random.randint(50, 500)});")

    # 3. Orders (2,000 records)
    sql.append("\n-- Orders")
    for i in range(1, 2001):
        cust_id = random.randint(1, 500)
        dt = (datetime(2026, 1, 1) + timedelta(days=random.randint(0, 150))).strftime('%Y-%m-%d %H:%M:%S')
        sql.append(f"INSERT INTO orders VALUES ({i}, {cust_id}, '{dt}', 0.00, 'Completed');")

    # 4. Order Items (10,000 records)
    print("Generating 10,000 order items...")
    sql.append("\n-- Order Items (10,000 records)")
    batch = []
    for i in range(1, 10001):
        ord_id = random.randint(1, 2000)
        prod_idx = random.randint(1, len(PRODUCTS_DATA))
        qty = random.randint(1, 3)
        price = PRODUCTS_DATA[prod_idx-1][2]
        subtotal = round(qty * price, 2)
        
        batch.append(f"({i}, {ord_id}, {prod_idx}, {qty}, {subtotal})")
        if len(batch) == 500 or i == 10000:
            sql.append(f"INSERT INTO order_items (item_id, order_id, product_id, quantity, subtotal) VALUES \n" + ",\n".join(batch) + ";")
            batch = []

    sql.append("SET FOREIGN_KEY_CHECKS = 1;")
    with open("ecommerce_seed_10k.sql", "w") as f:
        f.write("\n".join(sql))
    print("Generated 'ecommerce_seed_10k.sql' successfully!")

if __name__ == "__main__":
    generate_ecommerce_sql()
