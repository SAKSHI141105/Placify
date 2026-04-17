# Placify – AI-Powered Placement Email Assistant

Placify is a Chrome Extension designed to streamline the placement process by intelligently filtering, highlighting, and prioritizing placement-related emails directly within Gmail.

During placement seasons, students receive a large volume of emails, making it difficult to identify relevant opportunities. Placify solves this problem by automating email analysis and surfacing only the most important opportunities based on user context.

---

## Problem Statement

Students often face:
- Information overload from placement emails
- Difficulty identifying relevant opportunities
- Missing deadlines due to unorganized inbox
- Manual effort in scanning emails

Placify addresses these issues by introducing automation and intelligent filtering.

---

## Key Features

### Gmail Integration
- Automatically scans Gmail inbox
- Detects placement-related emails in real-time
- Works seamlessly within Gmail

### Smart Email Filtering
- Identifies keywords such as:
  - internship
  - placement
  - hiring
  - opportunity
- Highlights relevant emails for quick visibility

### User Profile System
- Stores user details including:
  - Full Name
  - Register Number
  - CGPA
  - Degree
- Uses cloud storage for persistence

### Auto-Fill Capability
- Automatically retrieves saved user data
- Reduces repetitive input effort

### Cloud Integration (Supabase)
- Uses PostgreSQL database via Supabase
- Supports scalable and multi-user architecture
- Enables centralized data storage

### Security Considerations
- Sensitive keys are excluded from version control
- Planned backend integration for enhanced security

---

## Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | HTML, CSS, JavaScript |
| Extension Framework | Chrome Extension (Manifest v3) |
| Database | Supabase (PostgreSQL) |
| Version Control | Git and GitHub |

---


