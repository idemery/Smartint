# Smartint
Smartint is a smart integration between Dynamics CRM and Dropbox to enable Document Management.

Check the video below:

[![Watch the video](https://img.youtube.com/vi/8XwzDby553I/maxresdefault.jpg)](https://youtu.be/8XwzDby553I)

Smartint communicates directly with Dropbox from your Dynamics CRM form js without any backend and uses [elFinder.js](https://github.com/Studio-42/elFinder) to enable file and folder management interface.

*Smartint currently doesn't support the new API version of Dropbox. However, lately elFinder seems to support Dropbox on its own, so maybe we switch to that in future.*

## How does Smartint work?

After importing the [solution](https://github.com/idemery/Smartint/raw/master/Smartint_2_2_1_0.zip) and opening it, the information page has a button **Authorize Smartint** which opens dropbox signing/app authorization page. The user logins to his Dropbox then authorizes Smartint app. This is required only once and creates a new folder 'Smartint' in the Apps folder of user's Dropbox space. Upon authorization a token is received and saved in an entity settings in CRM. The information page will then allow the user to choose (check/uncheck) entities they want to allow Smartint in. The information pages retrieves the metadata and modifies the formxml of the selected entities to add a navigation named 'Dropbox' with corresponding icon that opens a webresource smartint.html. Users can also add the webresource to the form manually through CRM customizations.

When a user opens the entity record and clicks on "Dropbox" for the first time, Smartint.html retrieves the token from the settings entity and creates a root folder for the entity in Smartint folder, then creates a child folder with the record id. This folder with any contents is what you see in elFinder.


## Want to contribute?

Contributions are welcomed, fork the solution, add your magic, and create a pull request! We need to support the new API version of Dropbox.
