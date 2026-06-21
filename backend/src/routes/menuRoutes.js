const router    = require('express').Router();
const auth      = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getMenuTree, getAllMenus } = require('../controllers/menuController');

router.get('/',    auth, getMenuTree);
router.get('/all', auth, authorize('menus:read'), getAllMenus);

module.exports = router;
