const mongoose = require('mongoose');
const userSessionSchema = mongoose.Schema({
  userId: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now(),
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

userSessionSchema.methods.recordSession = function (cb) {
  const user = this;
  const session = user._id;

  user.session = session;
  user.save((err, user) => {
    if (err) throw err;
    cb(null, user);
  });
};

const UserSession = mongoose.model('UserSession', userSessionSchema);

module.exports = { UserSession };
