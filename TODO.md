# Network Access Setup for VOG Chat

Your local IP: **192.168.0.104**

Frontend: http://192.168.0.104:5173  
Backend: http://192.168.0.104:3001

## Steps (will update as completed):

### [ ] 1. Create TODO.md ✅

### [x] 2. Edit vite.config.ts ✅

### [x] 3. Edit server/src/index.ts ✅

### [x] 4. Create .env.local ✅

### [x] 5. Windows Firewall ✅  
**Command**: `netsh advfirewall firewall add rule name="VOG Chat Backend" dir=in action=allow protocol=TCP localport=3001`  
**Command**: `netsh advfirewall firewall add rule name="VOG Chat Frontend" dir=in action=allow protocol=TCP localport=5173`
```
VITE_API_BASE=http://192.168.0.104:3001/api
FRONTEND_URL=http://192.168.0.104:5173
PORT=3001
```

### [ ] 5. Windows Firewall  
Allow inbound TCP ports 3001, 5173

### [ ] 6. Run `start.bat` and test  
Open http://192.168.0.104:5173 from other devices

**Note**: IP from `ipconfig`. If wrong network, run `ipconfig` again.
