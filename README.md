![jb_logo](https://github.com/user-attachments/assets/64e277c9-08b5-42e4-95bf-40cd9b6dfca6)

***osu!jukebox is a music player for your osu! library!***
It's based on Electron to ensure multiplat functionallity.

### v0.3 Notes:

**Features:**
1. Added a 'Folders scanned' count when the user selects a folder. This gives the user a rough estimate when the scan will be done. 
2. Songs now have a slight pink accent to distinct the currently playing track. 
3. Scroll bar has been given a modern makeover
4. You are now able to search via Tags AND the Mapper!
5. Added a 'Now Playing' section displaying current track info (Title, Artist, Creator).

**QoL:**
1. Made volume persistant between tracks (LOL)
2. If `osu!` folder is selected, select the `Songs` folder within it directly.
3. Search optimisations, scan optimisations, image display optimisations (Images loaded don't force refresh on every action anymore)
4. Now ignoring the "mp3s" smaller than 500KB as they are mostly sound effects used in storyboards of beatmaps.
5. Song titles no longer clip the music player controls. 
6. Seperated + Rearranged buttons at the top. 
7. Info window revamp

**Bugfixes:**
1. App crashing when a lot of songs are loaded and search is being used. (Made Howl.JS use HTML5 audio)

**NEXT UP (Possibly):**
1.  New playback features (e.g., shuffle, repeat).
2.  Miniplayer mode.
3.  Linux/macOS builds.
4.  Packaged installer and/or self-updater functionality.
5.  Further optmisations

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
