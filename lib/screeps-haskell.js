'use babel';

import { CompositeDisposable } from 'atom';
import https from 'https'
import fs from 'fs'
import exec from 'executive'

export default {
config: {
  "branch": {
    "type": "string",
    "default": "haskell"
  },
 "password": {
      "type": "string",
      "default": ""
    },
  "username": {
    "type": "string",
    "default": ""
  }
},
  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'screeps-haskell:push': () => this.push()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  serialize() {
  },

  push() {
	let pwd = atom.project.getPaths()[0];

	// check if stack.yaml exists
	if (fs.existsSync(pwd + "/stack.yaml")) {

		exec('which stack', (err, stdout, stderr) =>
		{
			if(stderr){
				atom.notifications.addError('Missing stack on local computer!')
			}else if (stdout){
				exec('cd ' + pwd + '; stack build ; find ./.stack-work/dist/ -name "all.js"').then( res => this.upload(pwd+res.stdout.trim().substr(1)))
			}
		})

	}else {
		atom.notifications.addError('Missing stack.yaml!')
	}

  },

  upload(basePath){
	let email = atom.config.get('screeps-haskell.username');
	let password = atom.config.get('screeps-haskell.password');
	let data = 	{ 	branch: atom.config.get('screeps-haskell.branch'),
	    			modules: {
			            main: fs.readFileSync(basePath, 'utf8')
			        }
		    	};

	let req = https.request({ 	hostname: 'screeps.com',
							    port: 443,
							    path: '/api/user/code',
							    method: 'POST',
							    auth: email + ':' + password,
							    headers: { 'Content-Type': 'application/json; charset=utf-8' }},
								function(res){
								      res.setEncoding('utf8');
								      res.on('data', function(chunk){
										let response = JSON.parse(chunk);
										if(response.hasOwnProperty('error')){
											atom.notifications.addError('wrong username or password')
										}else {
											atom.notifications.addSuccess('uploaded')
										}

								      });

									 res.on('end', function(){
							      				});
							    }
							);

	req.on('error', function(e){
		atom.notifications.addError(e)
	});

	req.write(JSON.stringify(data));
	req.end();
  }

};
