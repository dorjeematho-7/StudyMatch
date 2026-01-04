# StudyMatch
Building a platform to connect academically motivated students at UofT.  
Updated Dec 30th 2025

Quick Note: The goal of this project was to deepen my understanding of backend engineering, and so the front end was written with the aid of AI tools such as Cursor and Claude. Minimal to zero AI tools were used for backend programming as they would hinder my learning progress and experience.

Problem Statement:
Many university students struggle to find reliable and compatible study partners beyond their immediate friend groups or course-specific group chats. Existing solutions such as Discord servers, forums, or social media are unstructured, short-lived, and poorly suited for forming consistent academic collaborations. These platforms make it difficult for students to discover peers with matching courses, study habits, availability, and learning preferences, often leading to inefficient study sessions or studying in isolation. StudyMatch addresses this gap by providing a dedicated web application that enables University of Toronto students to discover and connect with compatible study partners through structured profiles and persistent academic connections.

**How it works**

The application manages user authentication, profile data, and connection requests through a Node.js backend with the Express framework and a PostgreSQL database, enabling persistent profiles and stateful interactions. Once connected, students can coordinate study sessions through the platform, providing a structured and reliable alternative to group chats or forum posts.


Below is the front page:

<img width="1891" height="862" alt="image" src="https://github.com/user-attachments/assets/fbcc2df1-99c7-4147-98fe-1ad7f566313d" />

**The user authentication process:**
StudyMatch uses a secure, session-based authentication system to manage user access. When a user registers, their password is securely hashed before being stored in the PostgreSQL database. During login, user credentials are authenticated on the server using the passport-local strategy. Upon successful authentication, a server-side session is established via Passport.js and express-session, allowing users to remain logged in across requests using a session identifier rather than sensitive data. Access to protected routes is restricted to authenticated users, ensuring that only logged-in students can view profiles, send study connection requests, and interact with platform features.

Protected routes are guarded by CheckAuthentication2, which restricts access to logged in users only. A session is created using an express session and each user gets a session identifier, which ensures that user info is never exposed to the browser as it is kept in the server side database  


<img width="200" height="400" alt="image" src="https://github.com/user-attachments/assets/15989b17-dcf9-4f34-bb78-c7cdfcd87224" />

Furthermore, there is also password and email checks that ensure the user is entering a valid email and password, for example, the user cannot leave the password and email boxes blank or must enter a number of characters within a certain valid range

<img width="200" height="400" alt="image" src="https://github.com/user-attachments/assets/8e098c4e-b655-4a4b-9b95-af39cecf93b5" />

**User Matching:**
Once logged in, users have the option to browse for other users with similar study preferences, of course, this page is only a rough draft and throughout the following semester many more feautures will be added such as profile pictures, improved visuals and more

**Displaying users:**
I got all the users and joined them with their study preferences using the user’s ID. I then checked the friend_requests table to determine the current status between the logged-in user and each other user (for example, no request, request already sent, or request received). This status is added as an extra field to each user object, and the final array is passed to the EJS file so the frontend can display the correct button or state for each user.
A table was formed by utilizing 

<img width="800" height="400" alt="image" src="https://github.com/user-attachments/assets/6310345b-8b28-4783-ad7c-a30b750d28c5" />


**Friend Requests**

When a user has sent a friend request, the recipient may see the request by selecting the friend request button at the top of the user matching page

<img width="300" height="600" alt="image" src="https://github.com/user-attachments/assets/276ea515-6588-4e00-a498-dbc1a69784d8" />

**User Messaging**
Once two users have been matched, a chat feature will pop up as shown below

<img width="400" height="400" alt="image" src="https://github.com/user-attachments/assets/3ac17c39-8713-4539-81a0-176f590c5cc6" />

This feature was straightforward to implement. I queried the friend_requests table for records with an 'accepted' status, joined them with the users table to retrieve usernames, and constructed an array containing each connected user’s ID and username.  

I am now learning webSockets and Sockets.io for the chatting/messaging feauture. Update Jan 3rd (My Bday!) 2026




