const jwt = require('jsonwebtoken');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware pour vérifier l'authentification
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Non autorisé' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

// Middleware pour vérifier les permissions
const checkPermissions = (requiredPermissions) => {
    return (req, res, next) => {
        // Si aucune permission n'est requise
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return next();
        }
        
        // Si l'utilisateur n'a pas été authentifié
        if (!req.user) {
            return res.status(401).json({ error: 'Non autorisé' });
        }
        
        // Vérifier si l'utilisateur possède les permissions requises
        const userPermissions = req.user.permissions;
        
        if (!Array.isArray(userPermissions)) {
            return res.status(403).json({ error: 'Permissions non définies' });
        }
        
        // Vérifier si l'utilisateur possède au moins une des permissions requises
        const hasPermission = Array.isArray(requiredPermissions)
            ? requiredPermissions.some(permission => userPermissions.includes(permission))
            : userPermissions.includes(requiredPermissions);
        
        if (!hasPermission) {
            return res.status(403).json({ error: 'Accès refusé - Permissions insuffisantes' });
        }
        
        next();
    };
};

module.exports = {
    authenticate,
    checkPermissions
};
