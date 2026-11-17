import random
from datetime import datetime, timedelta

DEPTS = [("Cardiology", "Block A"), ("Neurology", "Block B"), ("Pediatrics", "Block C"), ("Orthopedics", "Block D")]
FIRST_NAMES = ["Alexander", "Sophia", "Benjamin", "Mia", "Lucas", "Harper", "Ethan", "Evelyn", "Daniel", "Abigail"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

def generate_hospital_sql():
    sql = ["SET FOREIGN_KEY_CHECKS = 0;\n"]
    
    # 1. Departments
    sql.append("-- Departments")
    for i, (d_name, bldg) in enumerate(DEPTS, 1):
        sql.append(f"INSERT INTO departments VALUES ({i}, '{d_name}', '{bldg}');")

    # 2. Doctors (20 doctors)
    sql.append("\n-- Doctors")
    for i in range(1, 21):
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        spec = DEPTS[random.randint(0, len(DEPTS)-1)][0]
        sql.append(f"INSERT INTO doctors VALUES ({i}, '{fn}', '{ln}', '{spec}', {random.randint(1, 4)});")

    # 3. Patients (1,000 patients)
    sql.append("\n-- Patients")
    for i in range(1, 1001):
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        gender = random.choice(["Male", "Female"])
        phone = f"555-{random.randint(100,999)}-{random.randint(1000,9999)}"
        sql.append(f"INSERT INTO patients VALUES ({i}, '{fn}', '{ln}', '{gender}', '{phone}');")

    # 4. Appointments (10,000 records)
    print("Generating 10,000 hospital appointments...")
    sql.append("\n-- Appointments (10,000 records)")
    batch = []
    for i in range(1, 10001):
        p_id = random.randint(1, 1000)
        doc_id = random.randint(1, 20)
        appt_date = (datetime(2026, 3, 1) + timedelta(days=random.randint(0, 120))).strftime('%Y-%m-%d %H:%M:%S')
        status = random.choice(["Completed", "Scheduled", "Cancelled", "Completed"])
        
        batch.append(f"({i}, {p_id}, {doc_id}, '{appt_date}', '{status}')")
        if len(batch) == 500 or i == 10000:
            sql.append(f"INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, status) VALUES \n" + ",\n".join(batch) + ";")
            batch = []

    sql.append("SET FOREIGN_KEY_CHECKS = 1;")
    with open("hospital_seed_10k.sql", "w") as f:
        f.write("\n".join(sql))
    print("Generated 'hospital_seed_10k.sql' successfully!")

if __name__ == "__main__":
    generate_hospital_sql()
