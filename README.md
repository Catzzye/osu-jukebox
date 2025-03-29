![jb_logo](https://github.com/user-attachments/assets/64e277c9-08b5-42e4-95bf-40cd9b6dfca6)

***osu!jukebox is a music player for your osu! library!***
It's based on Electron to ensure multiplat functionallity.

### v0.3 Notes:

**Features:**
1. Added a 'Folders scanned' count when the user selects a folder. This gives the user a rough estimate when the scan will be done.
2. Songs now have a slight accent color (pink/orange based on theme) to distinguish the currently playing track.
3. Scroll bar has been given a modern makeover with theme support.
4. You are now able to search via Tags AND the Mapper (Creator)!
5. Added a 'Now Playing' section displaying current track info (Title, Artist, Creator).

**QoL (Quality of Life):**
1. Made volume persistent between tracks.
2. If the main `osu!` folder is selected, the app automatically navigates to the `Songs` subfolder.
3. Search, scanning, and playlist UI update optimisations (improving performance and responsiveness).
4. Now ignoring MP3 files smaller than 500KB during scans (typically storyboard/hitsound files).
5. Improved UI layout to prevent elements from overlapping player controls.
6. Rearranged top control buttons for better grouping (Folder select on left, others on right).
7. Added a themed, modern-looking popup for the Information button.

**Bugfixes:**
1. Addressed potential instability/crashes related to searching with large playlists by optimizing UI updates and ensuring Howler.js uses HTML5 audio loading.

**NEXT UP (Possibly):**
1.  New playback features (e.g., shuffle, repeat).
2.  Miniplayer mode.
3.  Linux/macOS builds.
4.  Packaged installer and/or self-updater functionality.
5.  Further optmisations

---


**Give it a go and let me know how it does / feel free to contribute!! :):)**

---

**Old notes:**

v0.2 Notes:
1. Implemented Howler.JS instead of regular HTML5 Audio player
2. The song name/artist are now pulled from .osu files themselves
3. Added search, so you can search through the scanned music!
4. Revamped audio controls; Previous and next track buttons added.
   
**NEXT UP:**
    1. More playback features? 
    2. Bug hunting/optimisation??


*v0.1 Notes:
There may be some lingering bugs, but the core functionallity should be working well enough! ... and I'm going to bed :-)*
Electron Developer menu can be accessed with: *set NODE_ENV=development* 
    NEXT UP:
    1. Pulling proper metadata from maps (currently going off of MP3 metadata)
    2. Implementing Howler.JS