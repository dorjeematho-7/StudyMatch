# StudyMatch
Building a platform to connect academically motivated students at UofT. Updated Dec 30th 2025

Problem Statement:
Many university students struggle to find reliable and compatible study partners beyond their immediate friend groups or course-specific group chats. Existing solutions such as Discord servers, forums, or social media are unstructured, short-lived, and poorly suited for forming consistent academic collaborations. These platforms make it difficult for students to discover peers with matching courses, study habits, availability, and learning preferences, often leading to inefficient study sessions or studying in isolation. StudyMatch addresses this gap by providing a dedicated web application that enables University of Toronto students to discover and connect with compatible study partners through structured profiles and persistent academic connections.

**How it works**

The application manages user authentication, profile data, and connection requests through a Node.js backend with the Express framework and a PostgreSQL database, enabling persistent profiles and stateful interactions. Once connected, students can coordinate study sessions through the platform, providing a structured and reliable alternative to ad-hoc group chats or forum posts.


Below is the front page:

<img width="1891" height="862" alt="image" src="https://github.com/user-attachments/assets/fbcc2df1-99c7-4147-98fe-1ad7f566313d" />

**The user authentication process:**
StudyMatch uses a secure, session-based authentication system to manage user access. When a user registers, their password is hashed before being stored in the PostgreSQL database. During login, credentials are validated on the server, and an authenticated session is established using Passport.js, allowing users to remain logged in across requests without exposing sensitive information to the client. Access to protected routes is restricted to authenticated users, ensuring that only logged-in students can view profiles, send study connection requests, or interact with platform features.

<img width="200" height="400" alt="image" src="https://github.com/user-attachments/assets/15989b17-dcf9-4f34-bb78-c7cdfcd87224" />

Furthermore, there is also password and email checks that ensure the user is entering a valid email and password, for example, the user cannot leave the password and email boxes blank or must enter a number of characters within a certain valid range

<img width="200" height="400" alt="image" src="https://github.com/user-attachments/assets/8e098c4e-b655-4a4b-9b95-af39cecf93b5" />

**User Matching**
Once logged in, users have the option to browse for other users with similar study preferences, of course, this page is only a rough draft and throughout the following semester many more feautures will be added such as profile pictures, improved visuals and more

**displaying users**
I fetched all users and joined them with their study preferences using the user’s ID. I then checked the friend_requests table to determine the current status between the logged-in user and each other user (for example, no request, request already sent, or request received). This status is added as an extra field to each user object, and the final array is passed to the EJS file so the frontend can display the correct button or state for each user.
A table was formed by utilizing 

<img width="800" height="400" alt="image" src="https://github.com/user-attachments/assets/6310345b-8b28-4783-ad7c-a30b750d28c5" />


**Friend Requests**

When a user has sent a friend request, the recipient may see the request by selecting the friend request button at the top of the user matching page

<img width="200" height="400" alt="image" src="https://github.com/user-attachments/assets/276ea515-6588-4e00-a498-dbc1a69784d8" />

**User Messaging**
Once two users have been matched, a chat feature will pop up, this is still in progress currently



