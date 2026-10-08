# Campus Hub: University Management System

> A school portal that replaces paper registers and scattered spreadsheets with one simple website.
> Live Demo:- https://campus-hub-qi6t.onrender.com

 **Built by:** Aditi Dubey

---

## Why I built this

Many schools still track attendance on paper, keep marks in spreadsheets, and write fee records in notebooks.
That means lost data, slow report cards, and parents who never see how their child is doing.

I wanted to build something that solves a real, everyday problem, so I made one portal where
the **admin, teachers, students and parents** each get exactly the view they need.

## What it does

**For the admin**
- Add, edit, search and remove students, teachers and classes
- Create fee records, mark them as paid, and print a fee voucher
- Build the weekly timetable for each class

**For teachers**
- Mark attendance in a few clicks (Present / Late / Absent)
- See a monthly attendance report, with low attendance highlighted in red
- Enter marks and generate a printable report card

**For students and parents**
- See results, attendance, fees and the timetable, read-only
- Download the report card and fee voucher as a PDF
- A parent can only ever see their own child's records

## Try it yourself

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@uni.edu | admin123 |
| Teacher | t.sharma@uni.edu | pass123 |
| Student | cs101@uni.edu | pass123 |
| Parent | parent.cs101@uni.edu | pass123 |

Tip: log in as the admin first, then as the parent, and notice how different the two views are.

## Things I'm proud of

- **Real access control.** Permissions are checked on the server, not just hidden in the screen. Even if someone calls the API directly, a parent still cannot open another child's data.
- **Safe by default.** Passwords are hashed, repeated wrong logins are blocked for 15 minutes, and the production setup starts with no demo accounts.
- **Tested.** 10 automated tests cover login, role permissions, validation, attendance, marks, fees and edits.
- **Easy to use.** Clear messages for every mistake, search boxes, edit windows, and a layout that works on phones.
- **Clean code.** The React app has one file per screen, and the API is organised by feature.

## Tech stack

| Part | Technology |
|------|------------|
| Frontend | React with Vite |
| Backend | Node.js and Express |
| Database | PostgreSQL |
| Login | JWT tokens and bcrypt password hashing |
| Tests | Node's built-in test runner |
| Hosting | Render (app) and Neon (database) |

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or higher.

1. Open a terminal inside this folder
2. Run `npm run setup` (1-2 minutes)
3. Run `npm start`
4. Open http://localhost:5000

On your own computer it uses a built-in demo database that resets on restart.
To keep data permanently, connect a free [Neon](https://neon.tech) PostgreSQL database:
copy `server/.env.example` to `server/.env` and paste your connection string into `DATABASE_URL`.

## Run the tests

```
npm test
```

## What I learned

- Designing one system for several user roles, and keeping each role's data separate
- Building a secure login with hashed passwords, tokens and rate limiting
- Writing automated tests so changes don't quietly break old features
- Taking a project from an idea to a live, hosted website

## What I would add next

- Email notifications to parents when their child is absent
- Charts for attendance and marks trends
- Online fee payment
- Bulk upload of students from a spreadsheet


