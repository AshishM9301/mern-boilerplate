const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bodyparser = require('body-parser');

const app = express();

const { User } = require('./models/User');
const { UserSession } = require('./models/UserSession');
const { Auth } = require('./middleware/Auth');
const config = require('./config/keys');

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(cookieParser());

mongoose
  .connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database is Connected'))
  .catch((err) => console.log(err));

app.get('/api/users/auth', Auth, (req, res) => {
  res.status(200).json({
    _id: req._id,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
  });
});

app.post('/api/users/register', (req, res) => {
  const { body } = req;
  const { firstName, lastName, password } = body;
  let { email } = body;

  if (!firstName) {
    return res.send({
      success: false,
      errorMessage: 'First Name is not Wriiten',
    });
  }
  if (!lastName) {
    return res.send({
      success: false,
      errorMessage: 'Last Name is not Written',
    });
  }
  if (!email) {
    return res.send({
      success: false,
      errorMessage: 'Email is blank',
    });
  }
  if (!password) {
    return res.send({
      success: false,
      errorMessage: 'Password field is Empty',
    });
  }
  if (password.length < 6) {
    return res.send({
      success: false,
      errorMessage: 'Password is less than 6 character',
    });
  }

  email = email.toLowerCase();

  User.find({ email: email }, (err, registeredUser) => {
    if (err) {
      return res.send({
        success: false,
        errorMessage: 'Server error',
      });
    } else if (registeredUser.length > 0) {
      return res.send({
        success: false,
        errorMessage: 'Already registered',
      });
    }

    const newUser = new User(req.body);

    newUser.email = email;
    newUser.firstName = firstName;
    newUser.lastName = lastName;
    newUser.password = newUser.generateHash(password);

    newUser.save((err, user) => {
      if (err)
        return res.send({
          success: false,
          message: 'Error: Server Error',
        });
      return res.send({
        success: true,
        message: `${user.firstName} is Registered`,
      });
    });
  });
});

app.post('/api/users/login', (req, res) => {
  const { body } = req;
  const { password } = body;
  let { email } = body;

  if (!email) {
    return res.send({
      success: false,
      errorMessage: 'Email id is not Entered',
    });
  }
  if (!password) {
    return res.send({
      success: false,
      errorMessage: 'Password is not Entered',
    });
  }

  email.toLowerCase();

  User.find({ email: email }, (err, users) => {
    if (err) {
      return res.send({
        success: false,
        errorMessage: 'Server Error',
      });
    }
    if (users.length != 1) {
      return res.send({
        success: false,
        errorMessage: 'User is not yet Registered',
      });
    }

    const user = users[0];

    if (!user.passwordVerification(password)) {
      return res.send({
        success: false,
        errorMessage: 'Entered Wrong Password',
      });
    }

    const newUserSession = new UserSession();

    newUserSession.userId = user._id;

    user.generateToken((err, user) => {
      if (err)
        return res.send({
          success: false,
          errorMessage: `Error in Generating token, ${err}`,
        });
      return newUserSession.save((err, data) => {
        if (err)
          return res.send({
            success: false,
            errorMessage: `Error in Recording Session, ${err}`,
          });
        return res.cookie('end_auth', user.token).send({
          success: true,
          message: 'login Success',
          session: data._id,
        });
      });
    });
  });
});

app.get('/api/users/logout', Auth, (req, res) => {
  const { query } = req;
  const { session } = query;

  UserSession.findOneAndUpdate(
    {
      _id: session,
      isDeleted: false,
    },
    {
      $set: { isDeleted: true },
    },
    null,
    (err, sessions) => {
      if (err) {
        return res.send({
          success: false,
          errorMessage: 'Server Error',
        });
      }
      return User.findOneAndUpdate(
        { _id: req.user._id },
        { token: '' },
        (err, data) => {
          if (err)
            res.send({
              success: false,
              errorMessage: 'Server Error',
            });
          return res.send({
            success: true,
            message: 'Logged out',
          });
        }
      );
    }
  );
});

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server Started on ${port}`));
