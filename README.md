# Install dependencies

npm install

# run both react and node.js

npm run dev

node server/index.js

# in .env file

the details to be added is the database that querylens itself uses not the "users" database details

means we are tracking all the db connections a user has made in our own OG "querylens_app" db

for secret run this : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# THe problems i found
i have connected to airlines but still randomly showing things dont use groq api 
2. showing the rows queried = 0

<img width="983" height="535" alt="Screenshot 2026-11-15 at 5 32 50 PM" src="https://github.com/user-attachments/assets/c4019449-522a-4207-ad0c-c9bce4e36c37" />

<img width="1406" height="165" alt="Screenshot 2026-11-15 at 5 32 41 PM" src="https://github.com/user-attachments/assets/bf6995db-9258-41ab-ae8f-a60f31637bbf" />

<img width="579" height="118" alt="Screenshot 2026-11-15 at 5 33 06 PM" src="https://github.com/user-attachments/assets/4e643921-f70a-4e81-9f99-e011d35f75c4" />

and also the deatils are not stored refreshing everytime
ill do the analytics page - that has graph and store the things in a table 

the things to be added in ANALYTICS PAGE:

1. Overview numbers: total queries run in the selected period, average execution time, number of slow queries, and success rate.
   
2. Trends charts: average execution time over time, and query volume over time (successful vs failed). You can switch between 24 hours, 7 days, and 30 days. These show whether things are getting faster or slower.

3.Slowest queries table: your most expensive queries, with average time, max time, number of runs, total time, and when they last ran. This is the most useful part. Clicking a row would open that query for deeper investigation.

4.Query health: a breakdown of queries into “no issues,” “potential optimization,” “critical,” and “not analyzed.”

5.Optimization insights: counts such as full table scans, index opportunities, and expensive sorting, based on query plans.
Recent activity (optional): a feed of recent runs.

All of this comes from the history you already record (SQL text, status, row count, duration, connection name, error). That’s why the history-recording issue matters: if history isn’t saving, the dashboard will be empty.

The Optimization Lab is different. It’s for one query at a time: you see its plan, try index changes, and compare before and after.

A short way to put it: Workspace writes queries, History lists past runs, Analytics shows patterns across all runs, and Optimization Lab digs into one query

