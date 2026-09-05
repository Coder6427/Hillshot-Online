UPLOAD THIS FOLDER TO GITHUB

The main game file is:
index.html

For GitHub Pages, upload index.html.

The file online-server.js is only for the online party server.
GitHub Pages will save it, but GitHub Pages will not run it.
That means Make Party and Join Party will not work from GitHub Pages alone.
To make parties work online, online-server.js must be deployed on a Node server
such as Render, Railway, Fly.io, or another web host that can run Node.js.

Simple version:
1. Open your GitHub repository.
2. Click Add file.
3. Click Upload files.
4. Drag index.html from this folder into GitHub.
5. Click Commit changes.
6. Go to Settings > Pages.
7. Set Source to Deploy from a branch.
8. Set Branch to main and folder to /root.
9. Save.

After a few minutes, your game link will look like:
https://YOUR-GITHUB-NAME.github.io/YOUR-REPOSITORY-NAME/
