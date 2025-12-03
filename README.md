# The Most Dangerous Game
---
**Introduction:**
To start, The Most Dangerous Game bares no relation to the novel by the same name.\
Instead, it refers to this augmented reality game I made using a Python Flask App and\
Javascript. Through a rudimentary UI, you can establish points correlating to\
real-life places using their latitude and longitude, create teams, and create users\
tied to those teams for players to use.

**Hosting the Application:**
To run locally, pull down this repository, install the requirements.txt, and run `main.py`.
Now, you could just open the port to this and run the game off of your machine. However, \
it is not ideal to run the app this way and have it open to the internet. It is best to host \
this application on a proper web server such as Apache. 
Right now, this application is hosted live @ www.themostdangerousgame.net

**How the Game is Played:**
After a game is setup, points set, teams made, and users created: players go to the site, \
select a game and join as a user. On the user page, the site pings their device every 30 seconds \
for their location. It then stores this information and displays their distance to points and other \
users in feet. If a user is within a hundred feet of a point, an attempt to capture the point starts.
During this attempt, the site checks to see who else is within a hundred feet of the point. It then \
checks the team for each closeby user. The team with the most people near a point capture it and score \
a point. To flip a point, a team needs to come in with more users then it was previously captured with. 
Once this happens the point flips, and the attacking team gains a point.
--- 
