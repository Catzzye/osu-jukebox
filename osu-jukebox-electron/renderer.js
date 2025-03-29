const { dialog } = require('@electron/remote')
const fs = require('fs')
const path = require('path')
const mm = require('music-metadata')
const os = require('os')
const { pathToFileURL } = require('url')
var { Howl, Howler } = require('howler')

let playlist = []
let currentSongIndex = -1
let currentHowl = null
let isPlaying = false
let currentVolume = 1;
let totalFolders = 0;
let scannedFolders = 0;
let songElements = [];

const playlistFilePath = path.join(os.homedir(), 'osu_jukebox_playlist.json')

document.addEventListener('DOMContentLoaded', async () => {
    const savedPath = localStorage.getItem('selectedFolder')
    setInitialTheme()
    if (fs.existsSync(playlistFilePath)) {
        loadPlaylistFromFile()
        document.getElementById('playlist').style.display = 'block'
        document.getElementById('selectFolder').style.display = 'none'
        document.getElementById('changeFolder').style.display = 'inline-block'
    } else if (savedPath) {
        document.getElementById('nowPlayingText').textContent = 'Select your osu! folder to start listening!';
        await scanDirectory(savedPath)
        if (playlist.length > 0) {
            savePlaylistToFile();
            updatePlaylistUI();
            document.getElementById('nowPlayingText').textContent = 'Select a song to play!';
            document.getElementById('playlist').style.display = 'block'
            document.getElementById('selectFolder').style.display = 'none'
            document.getElementById('changeFolder').style.display = 'inline-block'
        } else {
            localStorage.removeItem('selectedFolder');
        }
    }
})

document.getElementById('selectFolder').addEventListener('click', async () => {
    await selectAndScanFolder()
})

document.getElementById('changeFolder').addEventListener('click', async () => {
    await selectAndScanFolder()
})

document.getElementById('clearList').addEventListener('click', () => {
    playlist = []
    updatePlaylistUI()
    document.getElementById('playlist').style.display = 'none'
    document.getElementById('selectFolder').style.display = 'inline-block'
    document.getElementById('changeFolder').style.display = 'none'
    if (fs.existsSync(playlistFilePath)) {
        fs.unlinkSync(playlistFilePath)
    }
    localStorage.removeItem('selectedFolder');
    document.getElementById('nowPlayingText').textContent = 'Select your osu! folder to start listening!';
    if (currentHowl) {
        currentHowl.stop();
        currentHowl = null;
        currentSongIndex = -1;
        isPlaying = false;
        document.getElementById('playPauseButton').innerHTML = '<i style="padding-left: 8px;" class="fas fa-play"></i>';
        document.getElementById('currentTime').textContent = '0:00';
        document.getElementById('duration').textContent = '0:00';
        document.getElementById('seekBar').value = 0;
    }
})

document.getElementById('toggleTheme').addEventListener('click', () => {
    const body = document.body
    const themeButton = document.getElementById('toggleTheme')
    const searchIcon = document.getElementById('searchIcon')
    const searchInput = document.getElementById('searchInput')
    const seekBar = document.getElementById('seekBar')
    const volumeControl = document.getElementById('volumeControl')
    const audioControls = document.getElementById('audioControls')
    
    body.classList.toggle('dark-mode')
    
    if (body.classList.contains('dark-mode')) {
        themeButton.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>'
        searchIcon.style.color = 'white'
        searchInput.style.backgroundColor = '#333'
        searchInput.style.color = '#f5f5f5'
        searchInput.style.border = '1px solid #555'
        seekBar.style.background = 'white'
        seekBar.style.accentColor = '#c50a9d'
        volumeControl.style.background = 'white'
        volumeControl.style.accentColor = '#c50a9d'
        audioControls.style.backgroundColor = '#222'
    } else {
        themeButton.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>'
        searchIcon.style.color = '#f94ed4'
        searchInput.style.backgroundColor = 'white'
        searchInput.style.color = 'black'
        searchInput.style.border = '1px solid #ccc'
        seekBar.style.background = 'white'
        seekBar.style.accentColor = '#f94ed4'
        volumeControl.style.background = 'white'
        volumeControl.style.accentColor = '#f94ed4'
        audioControls.style.backgroundColor = '#950375'
    }
    
    updatePlaylistUI()
})

document.getElementById('infoButton').addEventListener('click', () => {
    const infoOverlay = document.createElement('div');
    infoOverlay.className = 'info-overlay';

    const infoWindow = document.createElement('div');
    infoWindow.className = 'info-popup';

    const logo = document.createElement('img');
    logo.src = 'jb_logo.png';

    const version = document.createElement('p');
    version.textContent = 'Version: 0.3';
    const author = document.createElement('p');
    author.textContent = 'By Catzzye (:';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'button';

    closeButton.addEventListener('click', () => {
  
        document.body.removeChild(infoOverlay);
    });

    infoWindow.appendChild(logo);
    infoWindow.appendChild(version);
    infoWindow.appendChild(author);
    infoWindow.appendChild(closeButton);

    infoOverlay.appendChild(infoWindow);

    document.body.appendChild(infoOverlay);

    infoOverlay.addEventListener('click', (event) => {
        if (event.target === infoOverlay) {
             document.body.removeChild(infoOverlay);
        }
    });
})

document.getElementById('searchInput').addEventListener('input', (event) => {
    filterPlaylistUI(event.target.value);
})

document.getElementById('volumeControl').addEventListener('input', (event) => {
    currentVolume = parseFloat(event.target.value);
    if (currentHowl) {
        currentHowl.volume(currentVolume);
    }
})

async function countTotalFolders(directoryPath) {
    try {
        let count = 0;
        const files = fs.readdirSync(directoryPath);
        
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            if (fs.statSync(filePath).isDirectory()) {
                count++;
                count += await countTotalFolders(filePath);
            }
        }
        return count;
    } catch (err) {
        console.error('Error counting folders:', err);
        return 0;
    }
}

async function selectAndScanFolder() {
    const userHomeDir = os.homedir();
    const defaultPath = path.join(userHomeDir, 'AppData', 'Local', 'osu!', 'Songs');

    let options = {
        properties: ['openDirectory']
    };

    if (fs.existsSync(defaultPath)) {
        options.defaultPath = defaultPath;
    }

    const result = await dialog.showOpenDialog(options);

    if (!result.canceled) {
        let selectedPath = result.filePaths[0];
        
        const folderName = path.basename(selectedPath);
        const potentialSongsPath = path.join(selectedPath, 'Songs');
        
        if (folderName === 'osu!' && fs.existsSync(potentialSongsPath)) {
            selectedPath = potentialSongsPath;
            console.log('Automatically selecting Songs folder within osu! directory');
        }

        localStorage.setItem('selectedFolder', selectedPath);
        playlist = []; 
        
        scannedFolders = 0;
        totalFolders = await countTotalFolders(selectedPath);
        
        const overlay = document.getElementById('overlay');
        overlay.innerHTML = `Scanning in progress...<br>Folders scanned: 0/${totalFolders}<br>This may take a while, depending on the size of your osu! library!`;
        overlay.style.display = 'flex';
        
        await scanDirectory(selectedPath);
        savePlaylistToFile();
        updatePlaylistUI();
        if(playlist.length > 0) {
            document.getElementById('nowPlayingText').textContent = 'Select a song to play!';
        } else {
            document.getElementById('nowPlayingText').textContent = 'No songs found in selected folder.';
        }
        overlay.style.display = 'none';
        document.getElementById('playlist').style.display = 'block';
        document.getElementById('selectFolder').style.display = 'none';
        document.getElementById('changeFolder').style.display = 'inline-block';
    }
}

async function scanDirectory(directoryPath) {
    try {
        const files = fs.readdirSync(directoryPath);
        scannedFolders++;
        
        const overlay = document.getElementById('overlay');
        overlay.innerHTML = `Scanning in progress...<br>Folders scanned: ${scannedFolders}/${totalFolders}<br>This may take a while, depending on the size of your osu! library!`;
        
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                await scanDirectory(filePath);
            } else if (path.extname(filePath).toLowerCase() === '.mp3') {
                const fileSizeInKB = stats.size / 1024;
                if (fileSizeInKB < 500) {
                    continue;
                }

                let title = path.basename(filePath);
                let artist = 'Unknown Artist';
                let creator = '';
                let tags = '';

                const osuFiles = files.filter(f => path.extname(f).toLowerCase() === '.osu');
                if (osuFiles.length > 0) {
                    const osuFilePath = path.join(directoryPath, osuFiles[0]);
                    const osuContent = fs.readFileSync(osuFilePath, 'utf-8');
                    const titleMatch = osuContent.match(/^Title:(.*)/m);
                    const artistMatch = osuContent.match(/^Artist:(.*)/m);
                    const creatorMatch = osuContent.match(/^Creator:(.*)/m);
                    const tagsMatch = osuContent.match(/^Tags:(.*)/m);

                    if (titleMatch) {
                        title = titleMatch[1].trim();
                    }
                    if (artistMatch) {
                        artist = artistMatch[1].trim();
                    }
                    if (creatorMatch) {
                        creator = creatorMatch[1].trim();
                    }
                    if (tagsMatch) {
                        tags = tagsMatch[1].trim();
                    }
                }

                try {
                    const metadata = await mm.parseFile(filePath);
                    const imageFiles = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()));
                    const imagePath = imageFiles.length > 0 ? path.join(directoryPath, imageFiles[0]) : null;

                    playlist.push({
                        path: filePath,
                        title: title,
                        artist: artist,
                        creator: creator,
                        tags: tags,
                        duration: metadata.format.duration,
                        image: imagePath
                    });
                } catch (err) {
                    console.error(`Error reading metadata for ${filePath}:`, err);
                }
            }
        }
    } catch (err) {
        console.error('Error scanning directory:', err);
    }
}

function updatePlaylistUI(searchQuery = '') {
    const playlistElement = document.getElementById('playlist')
    playlistElement.innerHTML = ''
    songElements = [];

    const body = document.body;
    const isDarkMode = body.classList.contains('dark-mode');

    playlist.forEach((song, index) => {
        const songElement = document.createElement('div')
        songElement.className = 'song-item'
        songElement.style.position = 'relative'
        songElement.style.marginBottom = '3px'
        songElement.style.height = '40px'
        songElement.style.width = 'calc(100% - 20px)';
        songElement.dataset.index = index;

        const backgroundImage = document.createElement('div')
        backgroundImage.style.position = 'absolute'
        backgroundImage.style.top = '0'
        backgroundImage.style.left = '0'
        backgroundImage.style.right = '0'
        backgroundImage.style.bottom = '0'
        backgroundImage.style.zIndex = '0'

        if (song.image) {
            try {
                const imageUrl = pathToFileURL(song.image).href;
                backgroundImage.style.backgroundImage = `url('${imageUrl}')`
                backgroundImage.style.backgroundSize = 'cover'
                backgroundImage.style.backgroundPosition = 'center'
                backgroundImage.style.filter = 'brightness(0.7)'
            } catch (e) {
                console.error(`Error creating file URL for image ${song.image}:`, e);
            }
        }

        songElement.appendChild(backgroundImage)

        const songText = document.createElement('span')
        songText.textContent = `${song.title} - ${song.artist}`
        songText.style.position = 'relative'
        songText.style.zIndex = '1'
        songText.style.fontWeight = 'bold'
        songText.style.padding = '2px 4px'

        if (isDarkMode) {
            songText.style.color = 'black'
            songText.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'
        } else {
            songText.style.color = 'white'
            songText.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
        }

        songElement.appendChild(songText)
        songElement.addEventListener('click', () => playSong(index))

        if (index === currentSongIndex) {
            songElement.classList.add('playing');
        }

        playlistElement.appendChild(songElement)
        songElements.push(songElement);
    })
    filterPlaylistUI(document.getElementById('searchInput').value);
}

function filterPlaylistUI(searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    songElements.forEach(songElement => {
        const index = parseInt(songElement.dataset.index, 10);
        const song = playlist[index];
        const matches = query === '' ||
                        song.title.toLowerCase().includes(query) ||
                        song.artist.toLowerCase().includes(query) ||
                        song.creator.toLowerCase().includes(query) ||
                        song.tags.toLowerCase().includes(query);
        songElement.style.display = matches ? '' : 'none';
    });
}

function playSong(index) {
    if (currentHowl) {
        currentHowl.stop()
    }

    const playlistElement = document.getElementById('playlist');
    const previousSongElement = playlistElement.querySelector('.song-item.playing');
    if (previousSongElement) {
        previousSongElement.classList.remove('playing');
    }

    currentSongIndex = index
    const song = playlist[index]

    const nowPlayingTextElement = document.getElementById('nowPlayingText');
    let nowPlayingHTML = `<strong>${song.title} - ${song.artist}</strong>`;
    if (song.creator) {
        nowPlayingHTML += ` [${song.creator}]`;
    }
    nowPlayingTextElement.innerHTML = nowPlayingHTML;

    const newSongElement = playlistElement.querySelector(`.song-item[data-index="${index}"]`);
    if (newSongElement) {
        newSongElement.classList.add('playing');
    }

    currentHowl = new Howl({
        html5: true,
        src: [song.path],
        volume: currentVolume,
        onplay: () => {
            isPlaying = true
            document.getElementById('playPauseButton').innerHTML = '<i style="padding-left: 13px;" class="fas fa-pause"></i>'
            updateSeekBar()
        },
        onend: () => {
            isPlaying = false
            document.getElementById('playPauseButton').innerHTML = '<i style="padding-left: 8px;" class="fas fa-play"></i>'
            if (currentSongIndex < playlist.length - 1) {
                playSong(currentSongIndex + 1)
            }
        },
        onload: () => {
            document.getElementById('duration').textContent = formatTime(currentHowl.duration())
        },
        onloaderror: (id, err) => {
            console.error('Error loading audio:', err)
        },
        onplayerror: (id, err) => {
            console.error('Error playing audio:', err)
        }
    })

    currentHowl.play()
}

function updateSeekBar() {
    if (currentHowl && isPlaying) {
        const seekBar = document.getElementById('seekBar')
        const currentTime = document.getElementById('currentTime')
        seekBar.max = currentHowl.duration()
        seekBar.value = currentHowl.seek()
        currentTime.textContent = formatTime(currentHowl.seek())

        requestAnimationFrame(updateSeekBar)
    }
}

document.getElementById('playPauseButton').addEventListener('click', () => {
    if (currentHowl) {
        if (isPlaying) {
            currentHowl.pause()
            isPlaying = false
            document.getElementById('playPauseButton').innerHTML = '<i style="padding-left: 8px;" class="fas fa-play"></i>'
        } else {
            currentHowl.play()
            isPlaying = true
            document.getElementById('playPauseButton').innerHTML = '<i class="fas fa-pause"></i>'
        }
    }
})

document.getElementById('seekBar').addEventListener('input', (event) => {
    if (currentHowl) {
        currentHowl.seek(event.target.value)
    }
})

document.getElementById('prevTrackButton').addEventListener('click', () => {
    if (currentSongIndex > 0) {
        playSong(currentSongIndex - 1)
    }
})

document.getElementById('nextTrackButton').addEventListener('click', () => {
    if (currentSongIndex < playlist.length - 1) {
        playSong(currentSongIndex + 1)
    }
})

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60) || 0
    const secs = Math.floor(seconds % 60) || 0
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`
}

function setInitialTheme() {
    const body = document.body
    const themeButton = document.getElementById('toggleTheme')
    const searchIcon = document.getElementById('searchIcon')
    const searchInput = document.getElementById('searchInput')
    const seekBar = document.getElementById('seekBar')
    const volumeControl = document.getElementById('volumeControl')
    const audioControls = document.getElementById('audioControls')

    if (body.classList.contains('dark-mode')) {
        themeButton.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>'
        searchIcon.style.color = 'white'
        searchInput.style.backgroundColor = '#333'
        searchInput.style.color = '#f5f5f5'
        searchInput.style.border = '1px solid #555'
        seekBar.style.background = 'white'
        seekBar.style.accentColor = '#c50a9d'
        volumeControl.style.background = 'white'
        volumeControl.style.accentColor = '#c50a9d'
        audioControls.style.backgroundColor = '#222'
    } else {
        themeButton.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>'
        searchIcon.style.color = '#f94ed4'
        searchInput.style.backgroundColor = 'white'
        searchInput.style.color = 'black'
        searchInput.style.border = '1px solid #ccc'
        seekBar.style.background = '#333'
        seekBar.style.accentColor = '#f94ed4'
        volumeControl.style.background = '#333'
        volumeControl.style.accentColor = '#f94ed4'
        audioControls.style.backgroundColor = '#950375'
    }
}

function savePlaylistToFile() {
    try {
        fs.writeFileSync(playlistFilePath, JSON.stringify(playlist, null, 2));
        console.log('Playlist saved to', playlistFilePath);
    } catch (err) {
        console.error('Error saving playlist:', err);
    }
}

function loadPlaylistFromFile() {
    try {
        const data = fs.readFileSync(playlistFilePath, 'utf-8');
        playlist = JSON.parse(data);
        updatePlaylistUI();
        if (playlist.length > 0) {
            document.getElementById('nowPlayingText').textContent = 'Select a song to play!';
        } else {
            document.getElementById('nowPlayingText').textContent = 'Playlist empty. Select a folder to scan.';
        }
    } catch (err) {
        console.error("Error loading playlist:", err);
        playlist = [];
        songElements = [];
        document.getElementById('playlist').innerHTML = '';
        document.getElementById('nowPlayingText').textContent = 'Error loading playlist. Select folder.';
        document.getElementById('selectFolder').style.display = 'inline-block';
        document.getElementById('changeFolder').style.display = 'none';
        if (fs.existsSync(playlistFilePath)) {
            fs.unlinkSync(playlistFilePath);
        }
        localStorage.removeItem('selectedFolder');
    }
} 