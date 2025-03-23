const { dialog } = require('@electron/remote')
const fs = require('fs')
const path = require('path')
const mm = require('music-metadata')
const os = require('os')

let playlist = []
let currentSongIndex = -1

document.addEventListener('DOMContentLoaded', async () => {
    const savedPath = localStorage.getItem('selectedFolder');
    if (savedPath) {
        await scanDirectory(savedPath);
        document.getElementById('playlist').style.display = 'block';
        document.getElementById('selectFolder').style.display = 'none';
        document.getElementById('changeFolder').style.display = 'inline-block';
    }
});

document.getElementById('selectFolder').addEventListener('click', async () => {
    await selectAndScanFolder();
});

document.getElementById('changeFolder').addEventListener('click', async () => {
    await selectAndScanFolder();
});

document.getElementById('clearList').addEventListener('click', () => {
    playlist = [];
    updatePlaylistUI();
    document.getElementById('playlist').style.display = 'none';
    document.getElementById('selectFolder').style.display = 'inline-block';
    document.getElementById('changeFolder').style.display = 'none';
});

document.getElementById('toggleTheme').addEventListener('click', () => {
    const body = document.body;
    const themeButton = document.getElementById('toggleTheme');
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        themeButton.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
    } else {
        themeButton.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
    }
    
    updatePlaylistUI();
});

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
        const selectedPath = result.filePaths[0];
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
                try {
                    const metadata = await mm.parseFile(filePath)
                    
                    const imageFiles = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()));
                    const imagePath = imageFiles.length > 0 ? path.join(directoryPath, imageFiles[0]) : null;

                    console.log(`Found image for ${filePath}: ${imagePath}`);

                    playlist.push({
                        path: filePath,
                        title: metadata.common.title || path.basename(filePath),
                        artist: metadata.common.artist || 'Unknown Artist',
                        duration: metadata.format.duration,
                        image: imagePath 
                    })
                } catch (err) {
                    console.error(`Error reading metadata for ${filePath}:`, err)
                }
            }
        }
        
        updatePlaylistUI()
    } catch (err) {
        console.error('Error scanning directory:', err)
    }
}

function updatePlaylistUI() {
    const playlistElement = document.getElementById('playlist');
    playlistElement.innerHTML = '';
    
    playlist.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        songElement.style.position = 'relative'; 
        songElement.style.marginBottom = '5px'; 
        songElement.style.height = '40px'; 

        const backgroundImage = document.createElement('div');
        backgroundImage.style.position = 'absolute';
        backgroundImage.style.top = '0';
        backgroundImage.style.left = '0';
        backgroundImage.style.right = '0';
        backgroundImage.style.bottom = '0';
        backgroundImage.style.zIndex = '0'; 

        if (song.image) {
            const imageUrl = `file://${encodeURI(song.image.replace(/\\/g, '/'))}`;
            console.log(`Setting background image for ${song.title}: ${imageUrl}`);
            backgroundImage.style.backgroundImage = `url('${imageUrl}')`;
            backgroundImage.style.backgroundSize = 'cover';
            backgroundImage.style.backgroundPosition = 'center';
            backgroundImage.style.filter = 'brightness(0.7)';
        }

        songElement.appendChild(backgroundImage);

        const songText = document.createElement('span');
        songText.textContent = `${song.title} - ${song.artist}`;
        songText.style.position = 'relative'; 
        songText.style.zIndex = '1'; 
        songText.style.fontWeight = 'bold'; 
        songText.style.padding = '2px 4px'; 

        songElement.style.width = 'calc(100% - 20px)'; 
        const body = document.body;
        if (body.classList.contains('dark-mode')) {
            songText.style.color = 'black';
            songText.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        } else {
            songText.style.color = 'white';
            songText.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; 
        }

        songElement.appendChild(songText);
        songElement.addEventListener('click', () => playSong(index));
        
        if (index === currentSongIndex) {
            songElement.style.backgroundColor = '#e0e0e0';
        }
        
        playlistElement.appendChild(songElement);
    });
}

function playSong(index) {
    const audioPlayer = document.getElementById('audioPlayer')
    currentSongIndex = index
    audioPlayer.src = playlist[index].path
    audioPlayer.play()
    updatePlaylistUI()
}

document.getElementById('audioPlayer').addEventListener('ended', () => {
    if (currentSongIndex < playlist.length - 1) {
        playSong(currentSongIndex + 1)
    }
}) 