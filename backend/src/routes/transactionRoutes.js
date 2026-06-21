const router   = require('express').Router();
const auth     = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { list } = require('../controllers/transactionController');

router.get('/', auth, authorize('transactions:read'), list);

module.exports = router;
