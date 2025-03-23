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
    const searchIcon = document.getElementById('searchIcon');
    const searchInput = document.getElementById('searchInput');
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        themeButton.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
        searchIcon.style.color = 'white';
        searchInput.style.backgroundColor = '#333';
        searchInput.style.color = '#f5f5f5';
        searchInput.style.border = '1px solid #555';
    } else {
        themeButton.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
        searchIcon.style.color = '#f94ed4';
        searchInput.style.backgroundColor = 'white';
        searchInput.style.color = 'black';
        searchInput.style.border = '1px solid #ccc';
    }
    
    updatePlaylistUI();
});

document.getElementById('infoButton').addEventListener('click', () => {
    const infoWindow = document.createElement('div');
    infoWindow.style.position = 'fixed';
    infoWindow.style.top = '50%';
    infoWindow.style.left = '50%';
    infoWindow.style.transform = 'translate(-50%, -50%)';
    infoWindow.style.padding = '20px';
    infoWindow.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    infoWindow.style.zIndex = '1001';
    infoWindow.style.textAlign = 'center';
    infoWindow.style.borderRadius = '8px';

    const body = document.body;
    if (body.classList.contains('dark-mode')) {
        infoWindow.style.backgroundColor = '#444';
        infoWindow.style.color = '#f5f5f5';
    } else {
        infoWindow.style.backgroundColor = 'white';
        infoWindow.style.color = 'black';
    }

    const logo = document.createElement('img');
    logo.src = 'jb_logo.png';
    logo.style.width = '175px';
    logo.style.marginBottom = '1px';

    const version = document.createElement('p');
    version.textContent = 'Version: 0.1';

    const author = document.createElement('p');
    author.textContent = 'By Catzzye (:';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'button';
    closeButton.style.marginTop = '10px';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(infoWindow);
    });

    infoWindow.appendChild(logo);
    infoWindow.appendChild(version);
    infoWindow.appendChild(author);
    infoWindow.appendChild(closeButton);

    document.body.appendChild(infoWindow);
});

document.getElementById('searchInput').addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    updatePlaylistUI(query);
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
        const files = fs.readdirSync(directoryPath);
        
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                await scanDirectory(filePath);
            } else if (path.extname(filePath).toLowerCase() === '.mp3') {
                let title = path.basename(filePath);
                let artist = 'Unknown Artist';

                // Look for .osu file in the same directory
                const osuFiles = files.filter(f => path.extname(f).toLowerCase() === '.osu');
                if (osuFiles.length > 0) {
                    const osuFilePath = path.join(directoryPath, osuFiles[0]);
                    const osuContent = fs.readFileSync(osuFilePath, 'utf-8');
                    //TODO maybe do a toggle for unicode and not unicode?
                    const titleMatch = osuContent.match(/Title:(.*)/);
                    const artistMatch = osuContent.match(/Artist:(.*)/);

                    if (titleMatch) {
                        title = titleMatch[1].trim();
                    }
                    if (artistMatch) {
                        artist = artistMatch[1].trim();
                    }
                }

                try {
                    const metadata = await mm.parseFile(filePath);
                    const imageFiles = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()));
                    const imagePath = imageFiles.length > 0 ? path.join(directoryPath, imageFiles[0]) : null;

                    console.log(`Found image for ${filePath}: ${imagePath}`);

                    playlist.push({
                        path: filePath,
                        title: title,
                        artist: artist,
                        duration: metadata.format.duration,
                        image: imagePath 
                    });
                } catch (err) {
                    console.error(`Error reading metadata for ${filePath}:`, err);
                }
            }
        }
        
        updatePlaylistUI();
    } catch (err) {
        console.error('Error scanning directory:', err);
    }
}

function updatePlaylistUI(searchQuery = '') {
    const playlistElement = document.getElementById('playlist');
    playlistElement.innerHTML = '';
    
    playlist.forEach((song, index) => {
        if (song.title.toLowerCase().includes(searchQuery) || song.artist.toLowerCase().includes(searchQuery)) {
            const songElement = document.createElement('div');
            songElement.className = 'song-item';
            songElement.style.position = 'relative'; 
            songElement.style.marginBottom = '3px'; 
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
        }
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