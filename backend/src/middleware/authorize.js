module.exports = (...codes) => (req, res, next) => {
  const userPerms = req.user?.permissions || [];
  const allowed = codes.every(code => userPerms.includes(code));
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  next();
};
