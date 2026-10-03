# TrailGuard Product Development Document

*A safety companion for solo cyclists, runners, and trekkers*

**Hackathon MVP** | **SportsTech and Innovation** | **October 2026**

**Product summary.** TrailGuard helps people begin an outdoor activity
with a safety plan, share their live progress with trusted contacts,
report hazards, and trigger an SOS workflow when a scheduled check-in is
missed. The hackathon MVP proves the core safety loop with a responsive
web application and a live demo scenario.

**Tagline:** Move freely. Get home safely.

# 1 Product Overview

TrailGuard addresses the safety gap faced by people who exercise or
travel outdoors alone. Existing activity apps are excellent at recording
distance and performance after a session. TrailGuard focuses on the
active safety layer during the session: preparation, check-ins,
trusted-contact visibility, and rapid response when something goes
wrong.

## Problem Statement

Solo riders, runners, and trekkers often use routes with poor road
conditions, isolated sections, changing weather, traffic hazards, or
limited mobile coverage. If they are delayed or injured, their trusted
contacts may not know their route, expected completion time, or last
known location. Local hazard knowledge also stays fragmented across chat
groups and personal experience.

## Product Vision

Create a practical safety network for outdoor movement in Nepal,
beginning with a simple activity safety session and evolving into a
trusted community map of route conditions and emergency support.

## Value Proposition

| **Audience**         | **Value delivered**                                                                                         |
|----------------------|-------------------------------------------------------------------------------------------------------------|
| Solo athlete         | A structured safety plan, timely reminders, and a quick SOS path without needing specialist equipment.      |
| Trusted contact      | Clear visibility of the activity status, expected finish time, and last known location when help is needed. |
| Outdoor community    | A shared, location-based record of hazards that makes route decisions safer.                                |
| Clubs and organisers | A lightweight way to monitor group activities and promote safe participation.                               |

# 2 Target Users and Use Cases

| **Persona**           | **Need**                                                                                 | **Primary use case**                                                                   |
|-----------------------|------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| Aarav Solo cyclist    | He rides outside Kathmandu early in the morning and wants someone to know if he is late. | Starts a ride, shares a safety link, checks in at intervals, and finishes safely.      |
| Maya Trail runner     | She wants to avoid poorly lit or unsafe route segments.                                  | Checks the community hazard map before choosing a route and reports a new hazard.      |
| Rohan Trusted contact | He needs useful information without constantly checking the athlete.                     | Receives an alert only when a check-in is missed and can view the last known location. |
| Coach Club organiser  | They need a simple overview of active club sessions.                                     | Views session status and responds to an alert through an operations dashboard.         |

# 3 Hackathon MVP Scope

The MVP proves one complete, reliable safety journey. It is not a full
navigation platform.

| **Included in MVP**                                                                                                                                                                                                         | **Deferred after hackathon**                                                                                                                                                                                |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Account or demo profile; activity setup; trusted-contact selection; expected finish time; mock live location; check-in timer; missed-check-in alert; SOS button; hazard reporting; map; contact dashboard; session history. | Real SMS or phone-call delivery; continuous background mobile tracking; nationwide moderation; real-time emergency-service integrations; full route navigation; automated accident detection; offline sync. |

## Core User Journey

| **Step**          | **User action**                                                                             | **System response**                                                                    |
|-------------------|---------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| 1 Plan            | Aarav selects Cycling, a route area, an expected finish time, and Rohan as trusted contact. | TrailGuard creates an active safety session and shares its status page.                |
| 2 Move            | Aarav begins the ride and sees a map with check-in timing.                                  | Mock GPS updates the current and last-known location.                                  |
| 3 Check in        | Aarav taps I am safe before the deadline.                                                   | The timer renews and the contact dashboard shows an all-clear status.                  |
| 4 Missed check in | Aarav does not respond to the next reminder.                                                | The session becomes Alerting and Rohan sees last location, time, and response options. |
| 5 Resolve         | Aarav checks in or Rohan marks the alert acknowledged.                                      | The activity returns to active or closes with an auditable event record.               |

# 4 Functional Requirements

| **ID** | **Requirement**                                                                                                        | **Priority** |
|--------|------------------------------------------------------------------------------------------------------------------------|--------------|
| FR 01  | Create a safety session with activity type, title, expected completion time, check-in interval, and a trusted contact. | Must         |
| FR 02  | Display the active session on a map with current and last-known location.                                              | Must         |
| FR 03  | Allow the athlete to complete a safety check-in and reset the next deadline.                                           | Must         |
| FR 04  | Automatically move a session to Alerting when the check-in deadline passes in demo mode.                               | Must         |
| FR 05  | Show trusted contacts an alert containing athlete name, activity, last location, and clear acknowledgement action.     | Must         |
| FR 06  | Let users submit a geo-tagged hazard report with category, severity, description, and optional photo.                  | Should       |
| FR 07  | Filter hazards on the map by category and recency.                                                                     | Should       |
| FR 08  | Show activity history and completed safety-session outcomes.                                                           | Could        |

# 5 Experience and Screen Plan

| **Screen**            | **Purpose**                                                                    | **Key interface elements**                                                                      |
|-----------------------|--------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| Landing and dashboard | Explain the safety promise and present an immediate Start safe session action. | Activity cards, recent safety sessions, safety tips, map preview.                               |
| Start safety session  | Collect the minimum information needed to protect a user.                      | Activity selector, finish time, check-in interval, contact picker, start button.                |
| Active session        | Keep the athlete informed without distracting them.                            | Large status indicator, map, remaining check-in time, one-tap I am safe and SOS actions.        |
| Trusted contact view  | Give a contact actionable context if the athlete is delayed.                   | Status banner, last known location, event timeline, acknowledge button, emergency instructions. |
| Hazard map            | Turn community observations into route-safety context.                         | Interactive map, category filters, severity pins, report-hazard sheet.                          |

# 6 System Design

The hackathon build uses the team’s familiar MERN stack: React with
Tailwind and shadcn-style components on the client, Express and Node.js
for APIs, and MongoDB for persistent session, contact, and hazard data.
Leaflet with OpenStreetMap provides a key-free map suitable for a fast
prototype. The live demo can simulate movement by stepping through
seeded coordinates at a fixed interval.

| **Component**             | **Responsibility**                                                                                             |
|---------------------------|----------------------------------------------------------------------------------------------------------------|
| React client              | Responsive athlete dashboard, contact dashboard, maps, forms, alert states, and demo controls.                 |
| Express API               | Authentication or demo profile, session lifecycle, check-ins, alerts, hazard submissions, and summary metrics. |
| MongoDB                   | Users, trusted contacts, safety sessions, session events, location pings, and hazard reports.                  |
| Leaflet and OpenStreetMap | Route and hazard-map display without an API key.                                                               |
| Notification adapter      | In-app alert feed for the MVP; designed so SMS, email, or push providers can be added later.                   |

## Primary Data Models

| **Model**      | **Important fields**                                                                                            |
|----------------|-----------------------------------------------------------------------------------------------------------------|
| User           | name, phone or email, emergency preferences, profile role                                                       |
| TrustedContact | ownerId, name, relationship, contact channel, active status                                                     |
| SafetySession  | ownerId, activityType, status, startTime, expectedEndTime, checkInInterval, nextCheckInDue, route, lastLocation |
| SessionEvent   | sessionId, type, timestamp, location, metadata, acknowledgement state                                           |
| HazardReport   | reporterId, category, severity, coordinates, description, imageUrl, createdAt, moderationStatus                 |

# 7 Safety and Product Principles

- TrailGuard is a coordination tool, not a replacement for emergency
  services, professional guidance, or safe decision-making.

- Location sharing is explicit, session-limited, and visible to the
  athlete. The user controls who can view their safety link.

- The MVP should clearly label simulated locations and demo alerts so
  users and judges understand the prototype boundary.

- Emergency alerts should display the most useful details first: status,
  timestamp, last known location, and a clear next action.

- Hazard reports should be treated as community observations; future
  versions require moderation and expiry rules.

# 8 Build Plan for 24 Hours

| **Window**     | **Outcome**                                                                                           | **Owner focus**             |
|----------------|-------------------------------------------------------------------------------------------------------|-----------------------------|
| Hours 0 to 2   | Lock scope, design system, routes, database models, and demo narrative.                               | Product and technical setup |
| Hours 2 to 7   | Build authentication or demo profile, activity setup, session APIs, seeded data, and dashboard shell. | Core workflow               |
| Hours 7 to 12  | Build active-session map, check-ins, deadline handling, SOS state, and contact alert page.            | Safety loop                 |
| Hours 12 to 16 | Build hazard reporting and community map filters. Improve responsive layout.                          | Differentiator              |
| Hours 16 to 20 | Seed polished Kathmandu-route demo data, test every state, and remove unfinished features.            | Demo quality                |
| Hours 20 to 24 | Prepare pitch, screen recording or backup screenshots, and rehearse the complete story.               | Presentation and QA         |

# 9 Demo Script

Use one believable story rather than a feature tour. The entire live
demonstration should take about two minutes.

| **Time** | **Demonstration**                                                                  | **Narration**                                                                                                         |
|----------|------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| 0:00     | Open the TrailGuard dashboard.                                                     | Solo outdoor activity should feel freeing, not uncertain for the athlete or the people waiting for them.              |
| 0:15     | Create Aarav’s morning cycling safety session and choose Rohan as trusted contact. | Aarav shares only the essentials: activity, route area, expected finish time, and a check-in interval.                |
| 0:40     | Start the activity and show moving location plus an on-time check-in.              | The athlete stays in control with one-tap check-ins. The trusted contact is not disturbed while everything is normal. |
| 1:00     | Use demo controls to miss the next check-in.                                       | If Aarav cannot respond, TrailGuard changes from tracking an activity to coordinating a safety response.              |
| 1:20     | Open Rohan’s contact dashboard and show last known location and alert timeline.    | Rohan knows what happened, when it happened, and where to begin looking—without guessing.                             |
| 1:40     | Open the hazard map and report an unsafe road section.                             | Over time, the same platform helps the whole community choose safer routes before a session even begins.              |

# 10 Success Criteria and Roadmap

## Hackathon Success Criteria

- A user can start a safety session and complete a check-in in under 30
  seconds.

- A missed check-in visibly creates an alert with a last-known location
  and event timestamp.

- A trusted contact can understand and acknowledge the alert without
  needing instructions.

- A user can submit and view a hazard report on the map.

- The entire demo works reliably with seeded data and a backup
  presentation path.

## Post Hackathon Roadmap

| **Phase** | **Next capabilities**                                                                                                                |
|-----------|--------------------------------------------------------------------------------------------------------------------------------------|
| Pilot     | Progressive web app install, trusted safety-link sharing, real push notifications, additional activity types, and moderated hazards. |
| Community | Route safety score, club dashboard, group rides, verified organisers, and report expiry or confirmation.                             |
| Scale     | SMS integrations, offline location queueing, wearables, local emergency partnerships, and privacy controls for data retention.       |

# Conclusion

TrailGuard turns a solo activity into a shared safety plan. Its
hackathon MVP is focused enough to build in 24 hours while demonstrating
a meaningful SportsTech innovation: an athlete can move independently,
trusted contacts can respond with context, and the outdoor community can
make routes safer together.
