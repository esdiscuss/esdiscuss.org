var browserid = navigator.id
document.getElementById('browserid')
  .addEventListener('click', function () {
    browserid.request({
      siteName: 'esdiscuss'
    });
  }, false)

browserid.watch({
  loggedInUser: null,
  onlogin: function(assertion) {
    // A user has logged in! Here you need to:
    // 1. Send the assertion to your backend for verification and to create a session.
    // 2. Update your UI.
    $.ajax({ /* <-- This example uses jQuery, but you can use whatever you'd like */
      type: 'POST',
      url: '/auth/persona', // This is a URL on your website.
      data: {assertion: assertion},
      success: function(res, status, xhr) { window.location.reload(); },
      error: function(xhr, status, err) {
        alert("Login failed: " + err);
      }
    });
  },
  onlogout: function() {
    // A user has logged out! Here you need to:
    // Tear down the user's session by redirecting the user or making a call to your backend.
    // Also, make sure loggedInUser will get set to null on the next page load.
    // (That's a literal JavaScript null. Not false, 0, or undefined. null.)
    $.ajax({
      type: 'POST',
      url: '/auth/logout', // This is a URL on your website.
      success: function(res, status, xhr) { window.location.reload(); },
      error: function(xhr, status, err) { alert("Logout failed: " + err); }
    });
  }
});