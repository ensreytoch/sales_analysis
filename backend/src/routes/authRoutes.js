const router      = require('express').Router();
const auth        = require('../middleware/authenticate');
const { login, refresh, logout, me } = require('../controllers/authController');

router.post('/login',   login);
router.post('/refresh', refresh);
router.post('/logout',  logout);
router.get('/me',       auth, me);

module.exports = router;
