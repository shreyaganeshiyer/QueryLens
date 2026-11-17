import random
from datetime import datetime, timedelta

AIRPORTS = [
    ("JFK", "John F. Kennedy International", "New York", "USA"),
    ("LAX", "Los Angeles International", "Los Angeles", "USA"),
    ("LHR", "Heathrow Airport", "London", "UK"),
    ("CDG", "Charles de Gaulle Airport", "Paris", "France"),
    ("DXB", "Dubai International", "Dubai", "UAE"),
    ("HND", "Haneda Airport", "Tokyo", "Japan"),
    ("SYD", "Sydney Kingsford Smith", "Sydney", "Australia"),
    ("SIN", "Changi Airport", "Singapore", "Singapore"),
    ("FRA", "Frankfurt Airport", "Frankfurt", "Germany"),
    ("ORD", "O'Hare International", "Chicago", "USA")
]

AIRCRAFT_MODELS = [
    ("Boeing 737-800", 189, "SkyWings"),
    ("Airbus A320neo", 180, "Global Airways"),
    ("Boeing 777-300ER", 396, "SkyWings"),
    ("Airbus A350-900", 315, "Pacific Jet"),
    ("Boeing 787-9 Dreamliner", 296, "Global Airways")
]

FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

def generate_insert_script():
    sql_statements = []
    sql_statements.append("-- Disable foreign key checks temporarily for smooth insertion")
    sql_statements.append("SET FOREIGN_KEY_CHECKS = 0;\n")

    # 1. Airports Inserts (with safe quote escaping)
    sql_statements.append("-- Inserting Airports")
    for code, name, city, country in AIRPORTS:
        safe_name = name.replace("'", "''")
        safe_city = city.replace("'", "''")
        safe_country = country.replace("'", "''")
        sql_statements.append(f"INSERT INTO airports (airport_code, airport_name, city, country) VALUES ('{code}', '{safe_name}', '{safe_city}', '{safe_country}') ON DUPLICATE KEY UPDATE airport_name=airport_name;")

    # 2. Aircraft Inserts
    sql_statements.append("\n-- Inserting Aircraft")
    for idx, (model, cap, airline) in enumerate(AIRCRAFT_MODELS, 1):
        safe_model = model.replace("'", "''")
        safe_airline = airline.replace("'", "''")
        sql_statements.append(f"INSERT INTO aircraft (aircraft_id, model, capacity, airline) VALUES ({idx}, '{safe_model}', {cap}, '{safe_airline}') ON DUPLICATE KEY UPDATE model=model;")

    # 3. Flights Inserts (500 flights)
    sql_statements.append("\n-- Inserting Flights")
    start_date = datetime(2026, 6, 1, 8, 0, 0)
    for flight_id in range(1, 501):
        f_num = f"SW{random.randint(100, 999)}"
        src, dest = random.sample(AIRPORTS, 2)
        ac_id = random.randint(1, len(AIRCRAFT_MODELS))
        dep = start_date + timedelta(hours=random.randint(1, 720))
        arr = dep + timedelta(hours=random.randint(2, 14))
        price = round(random.uniform(150.0, 1500.0), 2)
        
        sql_statements.append(f"INSERT INTO flights (flight_id, flight_number, source_airport, dest_airport, aircraft_id, departure_time, arrival_time, base_price) VALUES ({flight_id}, '{f_num}', '{src[0]}', '{dest[0]}', {ac_id}, '{dep}', '{arr}', {price});")

    # 4. Bookings Inserts (10,000 records in batches)
    print("Generating 10,000 booking statements...")
    sql_statements.append("\n-- Inserting Bookings (10,000 records)")
    
    batch_values = []
    for b_id in range(1, 10001):
        f_id = random.randint(1, 500)
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        p_name = f"{fname} {lname}".replace("'", "''")
        email = f"{fname.lower()}.{lname.lower()}{random.randint(10,999)}@example.com"
        seat = f"{random.randint(1, 35)}{random.choice(['A', 'B', 'C', 'D', 'E', 'F'])}"
        book_date = (datetime(2026, 5, 1) + timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d %H:%M:%S')
        status = random.choice(['Confirmed', 'Confirmed', 'Confirmed', 'Cancelled'])
        
        batch_values.append(f"({b_id}, {f_id}, '{p_name}', '{email}', '{seat}', '{book_date}', '{status}')")
        
        if len(batch_values) == 500 or b_id == 10000:
            values_str = ",\n".join(batch_values)
            sql_statements.append(f"INSERT INTO bookings (booking_id, flight_id, passenger_name, passenger_email, seat_number, booking_date, status) VALUES \n{values_str};")
            batch_values = []

    sql_statements.append("\n-- Re-enable foreign key checks")
    sql_statements.append("SET FOREIGN_KEY_CHECKS = 1;")

    with open("airline_inserts_10k.sql", "w") as f:
        f.write("\n".join(sql_statements))
    
    print("Successfully generated fixed 'airline_inserts_10k.sql'!")

if __name__ == "__main__":
    generate_insert_script()
