"""
scripts/setup_inventory_tables.py
Safe, idempotent migration to create dim_inventory_items and populate it with
clean master items mapping to fact_inventory, without touching or modifying any
existing records in fact_inventory or dim_products.
"""
import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from db import engine

# Catalog naming template per product & category to give rich, realistic names
PRODUCT_CATALOG_NAMES = {
    'Groceries': [
        'Organic Whole Wheat Flour', 'Premium Dark Roast Coffee', 'Cold-Pressed Olive Oil',
        'Pure Raw Clover Honey', 'Artisan Rolled Oats', 'Almond Milk Barista Edition',
        'Himalayan Pink Rock Salt', 'Organic Coconut Sugar', 'Dark Chocolate Truffles',
        'Sparkling Mineral Water', 'Matcha Green Tea Powder', 'Organic Quinoa Grain',
        'Roasted Cashew Kernels', 'Golden Chia Seeds', 'Wild Forest Berry Jam',
        'Apple Cider Vinegar', 'Aged Basmati Rice', 'Cold Brew Coffee Blend',
        'Multigrain Granola Bites', 'Herbal Chamomile Tea'
    ],
    'Electronics': [
        '4K Ultra HD Smart Monitor', 'Active Noise-Cancelling Headphones', 'Ergonomic Mechanical Keyboard',
        'Wireless Precision Mouse', 'USB-C Dual 4K Docking Station', 'Portable SSD 1TB High-Speed',
        'Noise-Isolating Studio Mic', 'Smart Fitness Tracking Band', 'Bluetooth Conference Speaker',
        'Fast Wireless Charging Pad', '1080p Wide-Angle Web Camera', 'Surge Protected Power Station',
        'True Wireless Earbuds Pro', 'Aluminum Tablet Stand Dock', 'Compact GaN Wall Charger 65W',
        'High-Speed HDMI 2.1 Cable', 'Magnetic MagSafe Car Mount', 'Smart Home Sensor Bridge',
        'Gaming Headset with Surround', 'LED Desktop Ambient Light'
    ],
    'Clothing': [
        'All-Weather Performance Jacket', 'Breathable Active Running Tee', 'Classic Slim Fit Chinos',
        'Fleece Pullover Thermal Hoodie', 'Merino Wool Crewneck Sweater', 'Waterproof Trail Walking Boots',
        'Quick-Dry Training Shorts', 'Seamless Compression Base Layer', 'Casual Oxford Cotton Shirt',
        'Windproof Lightweight Windbreaker', 'Thermal Winter Gloves Pair', 'Everyday Moisture-Wick Socks',
        'Heavyweight Relaxed Fit Pants', 'Insulated Down Vest Gilet', 'UV-Protective Outdoor Sun Hat',
        'Stretch Denim Casual Trousers', 'Polar Fleece Zip Sweatshirt', 'Athletic Ankle Socks (Pack of 3)',
        'Water-Resistant Parka Coat', 'Organic Cotton Everyday Polo'
    ],
    'Furniture': [
        'Ergonomic Mesh Swivel Chair', 'Solid Oak Executive Study Desk', 'Electric Dual-Motor Standing Desk',
        'Modern 4-Tier Bookshelf Unit', 'Modular 3-Seater Fabric Sofa', 'Tempered Glass Coffee Table',
        'Under-Desk 3-Drawer File Cabinet', 'Minimalist Bedside Nightstand', 'Mid-Century Dining Table',
        'Padded Fabric Dining Chairs (Set)', 'Industrial Wall-Mounted Coat Rack', 'Adjustable Dual Monitor Arm',
        'Soft Velvet Accent Armchair', 'Solid Wood TV Media Console', 'Steel Frame Storage Shelving',
        'Folding Conference Seminar Table', 'High-Back Lumbar Support Stool', 'Natural Bamboo Laptop Tray',
        'Geometric Wire End Table', 'Heavy-Duty Storage Footrest Ottoman'
    ],
    'Toys': [
        'STEM Programmable Robotics Kit', '100-Piece Magnetic Building Blocks', 'High-Speed Remote Control Drone',
        '3D Solar System Planetarium Model', 'Interactive Talking Globe Toy', 'Deluxe Wooden Train Track Set',
        '1000-Piece Architectural Puzzle', 'Junior Electronic Chemistry Lab', 'RC Off-Road Monster Truck',
        'DIY Wooden Marble Roller Coaster', 'Art & Craft Pottery Wheel Kit', 'Optical Beginners Telescope Kit',
        'Coding Board Game for Beginners', 'Illuminated Microscope Science Set', 'Action Hero Construction Figurine',
        'Digital Walkie Talkie Long-Range', 'Musical Electronic Keyboard Mat', 'Classic Wooden Chess & Checkers',
        'Interactive Dinosaur Fossil Excavation', 'Strategy Strategy Board Game Deluxe'
    ]
}

def get_product_name(product_id: str, category: str) -> str:
    """Generate a clean, professional product name from product_id and category."""
    try:
        # Extract product index (e.g., P0001 -> 1 -> idx 0)
        num = int(product_id.replace('P', ''))
        idx = (num - 1) % 20
    except Exception:
        idx = 0
    
    names_for_cat = PRODUCT_CATALOG_NAMES.get(category)
    if names_for_cat and idx < len(names_for_cat):
        base_name = names_for_cat[idx]
        return f"{base_name} ({product_id})"
    return f"{product_id} - {category} Item"

def main():
    print("Connecting to Neon PostgreSQL...")
    with engine.begin() as conn:
        # 1. Create dim_inventory_items table
        print("Creating dim_inventory_items table (if not exists)...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dim_inventory_items (
                item_id SERIAL PRIMARY KEY,
                sku VARCHAR(50) NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                region VARCHAR(50) NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_dim_inv_sku_cat_reg UNIQUE (sku, category, region)
            );
        """))

        # 2. Create indexes
        print("Creating indexes on dim_inventory_items and fact_inventory...")
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_inv_sku ON dim_inventory_items(sku);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_inv_cat ON dim_inventory_items(category);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_inv_reg ON dim_inventory_items(region);"))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_fact_inv_prod_cat_reg_date 
            ON fact_inventory(product_id, category, region, date DESC);
        """))

        # 3. Check existing row count in dim_inventory_items
        count = conn.execute(text("SELECT COUNT(*) FROM dim_inventory_items")).scalar()
        print(f"Current row count in dim_inventory_items: {count}")

        if count == 0:
            print("Populating dim_inventory_items from fact_inventory...")
            # Fetch distinct (product_id, category, region)
            distinct_combos = conn.execute(text("""
                SELECT DISTINCT product_id, category, region
                FROM fact_inventory
                WHERE product_id IS NOT NULL 
                  AND category IS NOT NULL 
                  AND region IS NOT NULL
                ORDER BY product_id, category, region
            """)).fetchall()

            print(f"Found {len(distinct_combos)} distinct product-category-region combinations.")

            inserted = 0
            for row in distinct_combos:
                sku, cat, reg = row[0], row[1], row[2]
                item_name = get_product_name(sku, cat)
                conn.execute(text("""
                    INSERT INTO dim_inventory_items (sku, item_name, category, region)
                    VALUES (:sku, :item_name, :category, :region)
                    ON CONFLICT (sku, category, region) DO NOTHING;
                """), {
                    "sku": sku,
                    "item_name": item_name,
                    "category": cat,
                    "region": reg
                })
                inserted += 1
            print(f"Successfully populated {inserted} items into dim_inventory_items.")
        else:
            print(f"Table dim_inventory_items already has {count} rows. Skipping initial population.")

        # 4. Verification queries
        total = conn.execute(text("SELECT COUNT(*) FROM dim_inventory_items")).scalar()
        cats = conn.execute(text("SELECT DISTINCT category FROM dim_inventory_items ORDER BY category")).fetchall()
        print(f"\nVerification:")
        print(f"  Total items in dim_inventory_items: {total}")
        print(f"  Categories in dim_inventory_items: {[c[0] for c in cats]}")
        
        sample = conn.execute(text("SELECT * FROM dim_inventory_items LIMIT 3")).mappings().all()
        print("  Sample records:")
        for s in sample:
            print("   ", dict(s))

if __name__ == "__main__":
    main()
