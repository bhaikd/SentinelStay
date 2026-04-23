# SentinelStay

SentinelStay is a high-fidelity, real-time emergency response platform built for hospitality and corporate environments. It connects guests in distress with rapid response teams, providing a centralized command center for dispatchers, and ensuring robust real-time communication during critical incidents.

## 🌟 Key Features

- **Guest SOS Portal & Chat**: An easy-to-use portal for guests to trigger SOS alerts and communicate directly with staff during emergencies.
- **Centralized Command Center**: A comprehensive dashboard for dispatchers to monitor active incidents, view building data, manage guest rosters, and dispatch responders.
- **Staff & Responder Portals**: Dedicated interfaces for on-ground staff and responders to receive assignments, update incident statuses, and coordinate efforts.
- **Corporate & Analytics Dashboards**: High-level overviews and analytics for corporate management to review incident resolution times, severity metrics, and staff performance.
- **Real-Time Data Sync**: Powered by Supabase, ensuring that all connected clients receive instant updates on incidents, chat messages, and status changes.
- **Simulation Mode**: A built-in backend worker script to simulate real-time incident flows for testing and demonstration purposes.

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Framer Motion (for fluid animations), Lucide React (icons)
- **State Management**: Zustand
- **Backend & Database**: Supabase (PostgreSQL, Realtime, Auth)
- **Data Visualization**: Recharts

## 🔄 Core Workflows

Understanding the workflows is crucial for operating the SentinelStay platform:

### 1. Guest Emergency Flow
- **Trigger**: A guest accesses the `Guest SOS Portal` (`/guest/sos`) and triggers an emergency alert.
- **Communication**: The guest is redirected to the `Guest Chat` (`/guest/chat`) where they can provide live updates and communicate with the command center.
- **Status**: The incident is logged into the system with an initial status (e.g., `pending`).

### 2. Command Center & Dispatch Flow
- **Monitoring**: Dispatchers monitor the `Command Center` (`/command`). New incidents appear in real-time.
- **Assessment**: Dispatchers review the incident details, building data (`/command/building`), and the guest roster (`/command/guests`).
- **Action**: Dispatchers can:
  - **Acknowledge** alerts.
  - **Respond**: Mark the incident as `responding` and assign available staff.
  - **Escalate**: Increase the incident severity if the situation worsens.
  - **Communicate**: Chat with the guest in distress to gather more information.
- **Resolution**: Once the situation is under control, the incident is marked as `resolved`.

### 3. Responder / Staff Flow
- **Assignment**: Staff members use the `Staff Dashboard` (`/staff`) or `Responder Portal` (`/responder`) to see assigned incidents.
- **Execution**: Responders update their status (e.g., `in-transit`, `on-scene`) and provide updates to the command center.

### 4. Corporate & Analytics Flow
- **Review**: Management uses the `Corporate Dashboard` (`/corporate`) and `Analytics Dashboard` (`/analytics`) to review historical data.
- **Metrics**: Track average response times, incident severity distributions, and overall platform effectiveness.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bhaikd/SentinelStay.git
   cd SentinelStay
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   Run the provided `schema.sql` script in your Supabase SQL editor to create the necessary tables and realtime publications.

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

### 🧪 Running the Simulation

To populate the platform with live mock data and simulate active incidents (useful for testing and demonstrations):

```bash
npm run simulate
```
This runs a background process (`server/simulate.ts`) that will generate random incidents, timeline events, and state changes.

## 📄 License

This project is proprietary and confidential.
