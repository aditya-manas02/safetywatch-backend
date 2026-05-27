# SafetyWatch - Neighborhood Safety & Incident Reporting

**SafetyWatch** is a comprehensive, real-time community safety and incident reporting platform designed to empower neighborhoods. It leverages community-driven reporting, real-time intelligence, and interactive map features to keep users aware of their surroundings and connect them with local authorities and neighbors during emergencies.

---

## 🚀 Key Features & Functionality

### 📡 Intelligence Feed & Real-time Alerts
A live ticker constantly streams real-time security signals, incident alerts, and system status updates from the command center, ensuring users are always informed about active situations nearby.

### 🆘 Emergency SOS (Guardian Mode)
A critical feature for real emergencies. Activating Guardian Mode instantly broadcasts the user's live GPS location via push notifications to all nearby neighbors and community members. It features background location syncing to maintain accurate tracking.

### 📝 Incident Reporting
Users can report suspicious activities, hazards, fires, or any other safety concerns. Reports support multimedia (images/videos uploaded via Cloudinary) and precise geolocation mapping.

### 🗺️ Live Density Heatmap & Local Watch
- **Density Heatmap:** Interactive Leaflet maps show red zones indicating high incident activity, helping users identify dangerous hotspots and plan safer routes.
- **Local Watch:** Filters and displays verified incidents reported strictly within a 10km radius of the user's current location.

### 👥 Community Circles
Allows users to create or join private "Circles" to coordinate with neighbors, apartment buildings, or local watch groups. Alerts and messages can be shared privately within these trusted networks.

### 📊 Community Surveys & Polls
Users can participate in local polls to help authorities understand neighborhood safety concerns, shaping better community decisions.

### 🏆 Gamification, Challenges & Leaderboard
To encourage active participation, users earn points for reporting incidents and verifying reports. The platform includes a **Leaderboard** and **Challenges** (e.g., "Report 5 hazards this week") to reward the most vigilant community members.

### 🤖 AI ChatBot Assistant
An integrated AI assistant (powered by Google Gemini) that provides intelligent safety advice, contextual help, and live translations to assist users in distress or those overcoming language barriers.

### 🛡️ Admin Dashboard & Moderation
A robust admin panel allowing super-users to:
- View real-time platform statistics and metrics.
- Manage user accounts (including suspensions and bans).
- Create and manage community challenges.
- Oversee all reported incidents and verify/close them.

---

## 💻 Technology Stack

### Frontend (Client-side & Mobile)
- **Framework:** React.js + Vite
- **Styling:** Tailwind CSS + custom CSS design system
- **UI Components:** Radix UI, Framer Motion (for fluid animations), React Joyride (for the App Tour)
- **Maps:** Leaflet & React-Leaflet
- **Mobile Support:** Capacitor (Android/iOS builds, native Geolocation, Push Notifications)

### Backend (Server-side)
- **Environment:** Node.js + Express.js
- **Database:** MongoDB (with Mongoose ODM)
- **Authentication:** JWT (JSON Web Tokens) + Bcrypt
- **File Storage:** Cloudinary (for profile pictures and incident media)
- **Notifications:** Firebase Admin SDK (FCM for cross-platform push notifications)
- **AI Integration:** Google Generative AI (Gemini API)

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v20.x recommended)
- MongoDB instance (local or Atlas)
- Firebase Project (for FCM)
- Cloudinary Account
- Google Gemini API Key

### 1. Backend Setup
1. Clone the repository and navigate to the root directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and fill in your credentials:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   GEMINI_API_KEY=your_gemini_key
   # Firebase Service Account JSON details...
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend_deploy
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file for the frontend (if required) pointing to your backend API URL (e.g., `VITE_API_URL=http://localhost:5000`).
4. Start the frontend development server:
   ```bash
   npm run dev
   ```

---

## 📱 Mobile App (Capacitor)
The frontend is built to be easily wrapped as a native mobile application using Capacitor. 
To build for Android:
```bash
cd frontend_deploy
npm run build
npx cap sync android
npx cap open android
```
*Note: Make sure your `capacitor.config.ts` is correctly set up with the appropriate App ID and bundled web directory.*

---

## 🔒 Security & Privacy
- All passwords are symmetrically hashed.
- API endpoints are protected using robust JWT middleware.
- Rate limiting is implemented to prevent abuse and DDoS attacks.
- Strict area code validation ensures that users only interact with incidents relevant to their physical community.

---
*Built with ❤️ for safer communities.*
