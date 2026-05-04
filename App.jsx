import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Play, Info, SquareTerminal, Calculator, Compass, File, StickyNote } from 'lucide-react';
import './index.css';

// Generic Icon resolver
const renderIcon = (iconName, fallbackIcon) => {
  if (iconName && iconName.startsWith('data:image/')) {
    return <img src={iconName} alt="App Icon" className="w-12 h-12 object-contain" />;
  }
  
  switch(iconName) {
    case 'file-explorer': return <File className="w-10 h-10 text-gray-800" />;
    case 'calculator': return <Calculator className="w-10 h-10 text-emerald-600" />;
    case 'firefox': return <Compass className="w-10 h-10 text-orange-500" />;
    case 'notes': return <StickyNote className="w-10 h-10 text-yellow-500" />;
    default: return fallbackIcon ? fallbackIcon : <Play className="w-10 h-10 text-gray-800" />;
  }
};

export default function App() {
  const [apps, setApps] = useState([]);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [reopenDotVisible, setReopenDotVisible] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    appId: null,
    isRenaming: false,
    newName: ''
  });

  const menuRef = useRef(null);

  useEffect(() => {
    const fetchApps = async () => {
      if (window.electronAPI) {
        const loadedApps = await window.electronAPI.getApps();
        setApps(loadedApps);
      }
    };
    fetchApps();

    const handleWindowOpened = () => {
      setReopenDotVisible(true);
      setTimeout(() => setReopenDotVisible(false), 2000); // hide dot after 2s
    };
    
    if (window.electronAPI) {
      window.electronAPI.onWindowOpened(handleWindowOpened);
    }

    setMounted(true);

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeWindowOpenedListener();
      }
    };
  }, []);

  useEffect(() => {
    // Arrow keys for rotation
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') setRotationOffset((prev) => prev - 15);
      if (e.key === 'ArrowDown') setRotationOffset((prev) => prev + 15);
      if (e.key === 'Escape') hideWindow();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hideWindow = () => {
    if (window.electronAPI) {
      window.electronAPI.hideWindow();
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleBackgroundClick = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
    } else {
      hideWindow();
    }
  };

  const handleSaveApps = (updatedApps) => {
    setApps(updatedApps);
    if (window.electronAPI) {
      window.electronAPI.saveApps(updatedApps);
    }
  };

  const launchApp = (appPath) => {
    if (window.electronAPI) {
      window.electronAPI.launchApp(appPath);
    }
  };

  const addApp = async () => {
    if (window.electronAPI) {
      const exePath = await window.electronAPI.openExeDialog();
      if (exePath) {
        const pathParts = exePath.split('\\');
        const defaultName = pathParts[pathParts.length - 1]; // filename
        const newApp = {
          id: Date.now().toString(),
          name: defaultName,
          path: exePath,
          icon: null
        };
        const newApps = [...apps, newApp];
        handleSaveApps(newApps);
      }
    }
  };

  const handleContextMenu = (e, appObj) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      appId: appObj.id,
      isRenaming: false,
      newName: appObj.name
    });
  };

  const changeIcon = async () => {
    if (window.electronAPI && contextMenu.appId) {
      const imagePath = await window.electronAPI.openImageDialog();
      if (imagePath) {
        const updatedApps = apps.map(a => a.id === contextMenu.appId ? { ...a, icon: imagePath } : a);
        handleSaveApps(updatedApps);
        setContextMenu({ ...contextMenu, visible: false });
      }
    }
  };

  const removeApp = () => {
    if (contextMenu.appId) {
      const updatedApps = apps.filter(a => a.id !== contextMenu.appId);
      handleSaveApps(updatedApps);
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const startRename = () => {
    setContextMenu(prev => ({ ...prev, isRenaming: true }));
  };

  const handleRenameChange = (e) => {
    setContextMenu(prev => ({ ...prev, newName: e.target.value }));
  };

  const handleRenameSubmit = (e) => {
    if (e.key === 'Enter') {
      const updatedApps = apps.map(a => 
        a.id === contextMenu.appId ? { ...a, name: contextMenu.newName } : a
      );
      handleSaveApps(updatedApps);
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  // Layout Calculation (Spiral / Circle Base)
  const [mounted, setMounted] = useState(false);
  const radius = 220; // Ajuste del tamaño sugerido por el usuario
  
  return (
    <div 
      className="w-full h-full flex items-center justify-center relative select-none"
      style={{ backgroundColor: 'rgba(0,0,0,0.01)' }} // almost transparent just to catch clicks
      onClick={handleBackgroundClick}
    >
      
      {/* Reopen Dot Reminder */}
      {reopenDotVisible && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 w-3 h-3 rounded-full animate-ping z-50"></div>
      )}

      {/* Contenedor Espiral Central */}
      <div 
        className="relative w-[600px] h-[600px] flex items-center justify-center transition-transform duration-300"
        style={{ transform: `rotate(${rotationOffset}deg)` }}
      >
        
        {/* Contenedor central de cristal (opcional, como sugerencia visual de la app principal) */}
        <div className={`absolute w-32 h-32 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)] flex items-center justify-center transition-all duration-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
           <span className="text-white/50 text-sm tracking-widest font-light">DORY</span>
        </div>

        {apps.map((appObj, index) => {
           // Cálculo de radianes
           const totalElements = apps.length + 1; // +1 por el botón Añadir
           const angle = (index / totalElements) * 2 * Math.PI; 
           
           const x = Math.cos(angle) * (radius);
           const y = Math.sin(angle) * (radius);
           
           // Rotación para que el "pétalo" apunte al centro
           const itemRotation = angle * (180 / Math.PI) + 90;

           return (
              <div 
                key={appObj.id}
                onClick={(e) => { e.stopPropagation(); launchApp(appObj.path); }}
                onContextMenu={(e) => handleContextMenu(e, appObj)}
                className="absolute transition-all duration-500 ease-out hover:scale-110 hover:z-50 cursor-pointer"
                style={{
                  transform: `translate(${x}px, ${y}px) rotate(${itemRotation}deg) scale(${mounted ? 1 : 0})`,
                  opacity: mounted ? 1 : 0,
                  transitionDelay: `${index * 50}ms`,
                  zIndex: totalElements - index
                }}
              >
                 <div className="w-24 h-32 bg-white/10 backdrop-blur-xl rounded-[20px] border border-white/20 flex flex-col items-center justify-center p-2 shadow-lg hover:bg-white/20 transition-colors">
                     {/* Contrarrotación para que el icono y texto se mantengan derechos */}
                     <div 
                        className="flex flex-col items-center justify-center w-full h-full pointer-events-none"
                        style={{ transform: `rotate(${-itemRotation - rotationOffset}deg)`, transition: 'transform 0.3s ease-out' }}
                     >
                        {renderIcon(appObj.icon)}
                        <span className="text-[10px] text-center mt-2 font-semibold truncate w-[90%] drop-shadow-md text-black/80">
                          {appObj.name}
                        </span>
                     </div>
                 </div>
              </div>
           );
        })}

        {/* Add App Button - el último elemento de la espiral */}
        {(() => {
           const index = apps.length;
           const totalElements = apps.length + 1;
           const angle = (index / totalElements) * 2 * Math.PI; 
           
           const x = Math.cos(angle) * (radius);
           const y = Math.sin(angle) * (radius);
           const itemRotation = angle * (180 / Math.PI) + 90;

           return (
              <div 
                 onClick={(e) => { e.stopPropagation(); addApp(); }}
                 className="absolute transition-all duration-500 ease-out hover:scale-110 hover:z-50 cursor-pointer"
                 style={{
                   transform: `translate(${x}px, ${y}px) rotate(${itemRotation}deg) scale(${mounted ? 1 : 0})`,
                   opacity: mounted ? 1 : 0,
                   transitionDelay: `${index * 50}ms`,
                   zIndex: totalElements - index
                 }}
              >
                 <div className="w-24 h-32 bg-white/5 backdrop-blur-xl rounded-[20px] border border-white/20 flex flex-col items-center justify-center p-2 shadow-lg hover:bg-white/20 transition-colors">
                     <div 
                        className="flex flex-col items-center justify-center w-full h-full pointer-events-none drop-shadow-md"
                        style={{ transform: `rotate(${-itemRotation - rotationOffset}deg)`, transition: 'transform 0.3s ease-out' }}
                     >
                        <Plus className="w-8 h-8 text-black/80" />
                     </div>
                 </div>
              </div>
           );
        })()}

      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          id="menu" 
          className="open"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="glow"></div>
          <div className="glow glow-bottom glow-bright"></div>
          <div className="shine"></div>
          <div className="shine shine-bottom"></div>
          
          <div className="inner z-10 relative">
            <header>
              <h1>Opciones de Aplicación</h1>
              <p>Modifica o elimina la app</p>
            </header>
            <hr />

            {contextMenu.isRenaming ? (
              <section>
                <label className="search">
                   <input 
                      autoFocus
                      type="text" 
                      value={contextMenu.newName} 
                      onChange={handleRenameChange} 
                      onKeyDown={handleRenameSubmit}
                      placeholder="Nuevo nombre y presiona Enter" 
                      className="w-full bg-transparent text-white/90 focus:outline-none"
                   />
                </label>
              </section>
            ) : (
              <section>
                <ul>
                  <li onClick={changeIcon} className="cursor-pointer">
                    <Settings className="w-4 h-4 text-white" />
                    <span className="text-white">Cambiar icono</span>
                  </li>
                  <li onClick={startRename} className="cursor-pointer">
                    <Info className="w-4 h-4 text-white" />
                    <span className="text-white">Cambiar nombre</span>
                  </li>
                  <hr />
                  <li onClick={removeApp} className="cursor-pointer">
                    <Play className="w-4 h-4 text-red-500" />
                    <span className="text-red-500">Eliminar</span>
                  </li>
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
