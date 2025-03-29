const { dialog } = require('@electron/remote')
const fs = require('fs')
const path = require('path')
const mm = require('music-metadata')
const os = require('os')
var { Howl, Howler } = require('howler')

let playlist = []
let currentSongIndex = -1
let currentHowl = null
let isPlaying = false
let currentVolume = 1;

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
        await scanDirectory(savedPath)
        document.getElementById('playlist').style.display = 'block'
        document.getElementById('selectFolder').style.display = 'none'
        document.getElementById('changeFolder').style.display = 'inline-block'
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
    const infoWindow = document.createElement('div')
    infoWindow.style.position = 'fixed'
    infoWindow.style.top = '50%'
    infoWindow.style.left = '50%'
    infoWindow.style.transform = 'translate(-50%, -50%)'
    infoWindow.style.padding = '20px'
    infoWindow.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)'
    infoWindow.style.zIndex = '1001'
    infoWindow.style.textAlign = 'center'
    infoWindow.style.borderRadius = '8px'

    const body = document.body
    if (body.classList.contains('dark-mode')) {
        infoWindow.style.backgroundColor = '#444'
        infoWindow.style.color = '#f5f5f5'
    } else {
        infoWindow.style.backgroundColor = 'white'
        infoWindow.style.color = 'black'
    }

    const logo = document.createElement('img')
    logo.src = 'jb_logo.png'
    logo.style.width = '175px'
    logo.style.marginBottom = '1px'

    const version = document.createElement('p')
    version.textContent = 'Version: 0.2'
    const author = document.createElement('p');
    author.textContent = 'By Catzzye (:';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'button';
    closeButton.style.marginTop = '10px'
    closeButton.addEventListener('click', () => {
        document.body.removeChild(infoWindow)
    })

    infoWindow.appendChild(logo)
    infoWindow.appendChild(version)
    infoWindow.appendChild(author)
    infoWindow.appendChild(closeButton)

    document.body.appendChild(infoWindow)
})

document.getElementById('searchInput').addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase()
    updatePlaylistUI(query)
})

document.getElementById('volumeControl').addEventListener('input', (event) => {
    currentVolume = parseFloat(event.target.value);
    if (currentHowl) {
        currentHowl.volume(currentVolume);
    }
})

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
        document.getElementById('overlay').style.display = 'flex';
        await scanDirectory(selectedPath);
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('playlist').style.display = 'block';
        document.getElementById('selectFolder').style.display = 'none';
        document.getElementById('changeFolder').style.display = 'inline-block';
    }
}

async function scanDirectory(directoryPath) {
    try {
        const files = fs.readdirSync(directoryPath)
        
        for (const file of files) {
            const filePath = path.join(directoryPath, file)
            const stats = fs.statSync(filePath)
            
            if (stats.isDirectory()) {
                await scanDirectory(filePath)
            } else if (path.extname(filePath).toLowerCase() === '.mp3') {
                let title = path.basename(filePath)
                let artist = 'Unknown Artist'

                const osuFiles = files.filter(f => path.extname(f).toLowerCase() === '.osu')
                if (osuFiles.length > 0) {
                    const osuFilePath = path.join(directoryPath, osuFiles[0])
                    const osuContent = fs.readFileSync(osuFilePath, 'utf-8')
                    const titleMatch = osuContent.match(/Title:(.*)/)
                    const artistMatch = osuContent.match(/Artist:(.*)/)

                    if (titleMatch) {
                        title = titleMatch[1].trim()
                    }
                    if (artistMatch) {
                        artist = artistMatch[1].trim()
                    }
                }

                try {
                    const metadata = await mm.parseFile(filePath)
                    const imageFiles = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()))
                    const imagePath = imageFiles.length > 0 ? path.join(directoryPath, imageFiles[0]) : null

                    playlist.push({
                        path: filePath,
                        title: title,
                        artist: artist,
                        duration: metadata.format.duration,
                        image: imagePath 
                    })
                } catch (err) {
                    console.error(`Error reading metadata for ${filePath}:`, err)
                }
            }
        }
        
        savePlaylistToFile()
        updatePlaylistUI()
    } catch (err) {
        console.error('Error scanning directory:', err)
    }
}

function updatePlaylistUI(searchQuery = '') {
    const playlistElement = document.getElementById('playlist')
    playlistElement.innerHTML = ''
    
    playlist.forEach((song, index) => {
        if (song.title.toLowerCase().includes(searchQuery) || song.artist.toLowerCase().includes(searchQuery)) {
            const songElement = document.createElement('div')
            songElement.className = 'song-item'
            songElement.style.position = 'relative' 
            songElement.style.marginBottom = '3px' 
            songElement.style.height = '40px' 

            const backgroundImage = document.createElement('div')
            backgroundImage.style.position = 'absolute'
            backgroundImage.style.top = '0'
            backgroundImage.style.left = '0'
            backgroundImage.style.right = '0'
            backgroundImage.style.bottom = '0'
            backgroundImage.style.zIndex = '0' 

            if (song.image) {
                const imageUrl = `file://${encodeURI(song.image.replace(/\\/g, '/'))}`
                //console.log(`Setting background image for ${song.title}: ${imageUrl}`)
                backgroundImage.style.backgroundImage = `url('${imageUrl}')`
                backgroundImage.style.backgroundSize = 'cover'
                backgroundImage.style.backgroundPosition = 'center'
                backgroundImage.style.filter = 'brightness(0.7)'
            }

            songElement.appendChild(backgroundImage)

            const songText = document.createElement('span')
            songText.textContent = `${song.title} - ${song.artist}`
            songText.style.position = 'relative' 
            songText.style.zIndex = '1' 
            songText.style.fontWeight = 'bold' 
            songText.style.padding = '2px 4px' 

            songElement.style.width = 'calc(100% - 20px)' 
            const body = document.body
            if (body.classList.contains('dark-mode')) {
                songText.style.color = 'black'
                songText.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'
            } else {
                songText.style.color = 'white'
                songText.style.backgroundColor = 'rgba(0, 0, 0, 0.7)' 
            }

            songElement.appendChild(songText)
            songElement.addEventListener('click', () => playSong(index))
            
            if (index === currentSongIndex) {
                songElement.style.backgroundColor = '#e0e0e0'
            }
            
            playlistElement.appendChild(songElement)
        }
    })
}

function playSong(index) {
    if (currentHowl) {
        currentHowl.stop()
    }

    currentSongIndex = index
    const song = playlist[index]

    currentHowl = new Howl({
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
    updatePlaylistUI()
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
    const data = fs.readFileSync(playlistFilePath, 'utf-8')
    playlist = JSON.parse(data)
    updatePlaylistUI()
} 