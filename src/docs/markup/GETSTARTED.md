# Get Started

The Custom Application SDK allows you to write and easily deploy applications that nativily integrate into the Mazda Connect Infotainment System.

In this tutorial you will learn how to get started writing your first application and deploy it.

But before you get started, please get your prequisites installed.

## Install the Command Line Tool

Open a terminal or command line and install the Command line tool by typing:

```
  npm install -g casdk
```

Navigate to the folder that you have selected for your custom applications in the Simulator and type:

```
  casdk create myapp
```

This will create a folder called ```app.myapp``` with all the files that a Custom Application needs:

```javascript
  app.js    # a JavaScript file containing your actual application
  app.css   # a CSS stylesheet for your application
  app.png   # a cool icon for your application
```

Start your Simulator and you will see your new application in the list.

[screenshot1]

## Let's modify the app

Open up the file ```app.js``` in your editor and change attribute ```title``` to ```Hello World``` like:

```javascript

  settings: {

    /**
     * (title) The title of the application in the Application menu
     */

    title: 'Hello World',
```

Go back to the Simulator and the menu should have the new title.

[screenshot2]

If you select the application by hitting <kbd>Return</kbd>, click the centerpoint of the Multicontroller or using your mouse.

Your application looks pretty empty.

[screenshot3]

Let's change this.

## Adding the Meat

Add the following line to the lifecyle event ```created```:

```javascript

  created: function() {

    this.label = $("<label/>").html("Hello World").appendTo(this.canvas);

  },
```

Go back to the simulator and it should look like this:

[screenshot4]

## Styling your applications.

Still looks a bit boring. Let's add some color to it. Open up the ```app.css``` and add the following line to it:

```css

  [app="app.myapp"] label {
    position: absolute;
    top:100px;
    left:100px;
    color: red;
  }

```

Looks much better:

[screenshot5]

## Let's do some interactivity

Add the following code to the event ```onControllerEvent```:

```javascript

  onControllerEvent: function(eventId) {

      switch(eventId) {

        /*
         * MultiController's center was pushed down
         */
        case this.SELECT:

            this.label.css("color", ['red', 'green', 'blue', 'yellow'][(Math.floor(Math.random() * 4))]);

          break;

      }
  }
```

Hit the multicontroller in the middle and the label color will change.


## Let's deploy

You have finished your first application. To deploy it to the Infotainment system, just copy the entire application folder to the folder ```applications``` on the SDCard.

Insert the SD-Card and reboot the Infotainment system.

**Congratulations** You finished your first custom application for the Infotainment system.






