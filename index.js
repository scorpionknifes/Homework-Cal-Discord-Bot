const config = require('./config.json');
var schedule = require('node-schedule');
const Discord = require('discord.js');
const util = require('util');
var homework = require('./homework.json');
var userdata = require('./userdata.json');
var GoogleSpreadsheet = require('google-spreadsheet');
let fs = require('fs');
var now = new Date();
var cron = require('node-cron');

//ics
const ical = require('node-ical');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var defaultreporttype = "B";

const bot = new Discord.Client({
    disableEveryone: true,
    disabledEvents: ['TYPING_START']
});
var offset;

function ics(){
	ical.fromURL('https://canvas.auckland.ac.nz/feeds/calendars/user_5RmhBBAs1dHne0oJwqMNpFC68ez1VCA0k9tnKT7B.ics', {}, function (err, data) {
	  for (let k in data) {
		if (data.hasOwnProperty(k)) {
		  var ev = data[k];
		  if (data[k].type == 'VEVENT') {
			console.log(`${ev.summary} is in ${ev.location} on the ${ev.start.getDate()} of ${months[ev.start.getMonth()]} at ${ev.start.toLocaleTimeString('en-GB')}`);
			var names = ev.summary.split("[");
			var c = names[1].split("]");
			var coursed = c[0];
			var t = names[0].split(" ");
			var name1 = t[0]
			for(var i = 1; i<t.length-1; i++){
				name1 += "_" +t[i];
			}
			let firstDate = new Date((ev.start.getMonth()+1)+"-"+ev.start.getDate()+"-"+ev.start.getFullYear()),
				secondDate = ev.start,
				timeDifference = Math.abs(secondDate.getTime() - firstDate.getTime());
				console.log (firstDate);
				console.log (secondDate);
			console.log (timeDifference);
			if (timeDifference > 0 && timeDifference < 12*60*60*1000+1){
				console.log("Morning Test");
				ev.start.setDate(ev.start.getDate() - 1);
			}
			console.log(names[0]);
			if (now.getDate() < ev.start.getDate() && now.getMonth() <= ev.start.getMonth()){
				var currentcourse = "";
				switch(coursed){
					case "CHEMMAT 121":
					currentcourse = "CHEMMAT 121";
					break;
					case "ELECTENG 101":
					currentcourse = "ELECTENG 101";
					break;
					case "ENGGEN 115":
					currentcourse = "ENGGEN 115";
					break;
					case "ENGGEN 131":
					currentcourse = "ENGGEN 131";
					break;
				}
				var homeworkreporttype = "A";
				var datebasesstring = (String(('0' + (ev.start.getDate())).slice(-2))+"-" + String(('0' + (ev.start.getMonth()+1)).slice(-2))+"-" + ev.start.getFullYear());
				if (homework.list.map(function (test) {return test.name; }).indexOf(name1) == -1 ){
					homework.list.push({"name": `${name1}`,"course":`${currentcourse}`,"datedue":`${datebasesstring}`,"role":`${currentcourse}`,"report":`${homeworkreporttype}`});
				}
			}
		}
		}
	  }
	  write(homework,"homework");
	  console.log(homework);
	  return;
	});
}

function removeoldhw(){
	console.log("removing old hw");
	homework = require('./homework.json');
	for (var i=0; i<homework.list.length; i++){
		var d = homework.list[i].datedue.split("-");
		var hwdate = new Date(d[2]+"-"+d[1]+"-"+d[0]);
		var timedifference = hwdate.getTime()-now.getTime()
		console.log(timedifference);
		if (timedifference < -86400000){
			console.log("removed " + homework.list[i].name);
			homework.list.splice(i,1); 
		}
	}
	write(homework,"homework");
}


cron.schedule("0 0 * * * *", function(){
	now = new Date();
	console.log("1 Hour passed " + now.toJSON());
	checktime();
	removeoldhw();
    console.info('cron job completed');
	
});    
cron.schedule("0 0 3 * * *", function(){
	ics();
}); 
function checktime(){
	homework = require('./homework.json');
	console.log("Checking for Homeworks: "+  homework.list.length);
	var homeworkdue = [];
	//Check database for all homework and tests
	for (var i=0; i<homework.list.length; i++){
		console.log("Checking " + homework.list[i].name);
		var homeworkdate = homework.list[i].datedue.split("-");
		console.log(homeworkdate);
		console.log(String(('0' + (now.getDate()+1)).slice(-2))+" " + String(('0' + (now.getMonth()+1)).slice(-2))+" " + now.getFullYear());
		if((homeworkdate[0]==String(('0' + (now.getDate())).slice(-2)))&&(homeworkdate[1]==String(('0' + (now.getMonth()+1)).slice(-2)))&&(homeworkdate[2]==String(now.getFullYear()))){
			console.log("Due Today is " + homework.list[i].name);
			var reporthrs = homework.reporttype[homework.reporttype.map(function (test) {return test.type; }).indexOf(homework.list[i].report)].times;
			console.log(" Current Hour: " +now.getHours());
			if (reporthrs.indexOf(String(now.getHours())) > 0){
				console.log(reporthrs.indexOf(now.getHours()));
				console.log("Reporting " + homework.list[i].name);
				console.log(homework.courses.indexOf(homework.list[i].role));
				var response = `<@&${config.courseroleid[config.courseroleid.map(function (test) {return test.name; }).indexOf(homework.list[i].course)].id}> ***Homework Reminder for*** **${homework.list[i].name}** *Due - ${homework.list[i].datedue}*`
				
				bot.channels.get(config.studychannels[config.courseroleid.map(function (test) {return test.name; }).indexOf(homework.list[i].role)].id).send(response);
				
			}
		}
	}
	console.log("Homework Check is Complete");
	
}

bot.on("ready", () => {
	
    bot.user.setGame('with Cool Max'); //you can set a default game
    console.log(`Bot is online!\n${bot.users.size} users, in ${bot.guilds.size} servers connected.`);
	var datestring;
	var mydate = new Date(datestring);
	console.log(mydate.toDateString());
	checktime();
	removeoldhw();
	ics();
});

bot.on("guildCreate", guild => {
    console.log(`I've joined the guild ${guild.name} (${guild.id}), owned by ${guild.owner.user.username} (${guild.owner.user.id}).`);
});

bot.on("message", async message => { 

    if(message.author.bot || message.system) return; // Ignore bots
    
    if(message.channel.type === 'dm') { // Direct Message
        return; //Optionally handle direct messages
    } 

    console.log(message.content); // Log chat to console for debugging/testing
	
    if (message.content.indexOf(config.prefix) === 0) { // Message starts with your prefix
        
        let msg = message.content.slice(config.prefix.length); // slice of the prefix on the message

        let args = msg.split(" "); // break the message into part by spaces

        let cmd = args[0].toLowerCase(); // set the first word as the command in lowercase just in case

        args.shift(); // delete the first word from the args

        
        if (cmd === 'hi' || cmd === 'hello') { // the first command [I don't like ping > pong]
            message.channel.send(`Hi there ${message.author.toString()}`);
            return; 
        }

        else if (cmd === 'ping') { // ping > pong just in case..
            return message.channel.send('pong');
        }
		
		
		else if (cmd === 'register'|| cmd === 'roles' || cmd === 'role' || cmd === 'setup'){
			let pos;
			console.log(message.member.id);
			console.log(userdata.user);
			pos = userdata.user.map(function (test) {return test.id; }).indexOf(message.member.id);
			try {
				var currentroles = userdata.user[pos].roles;
			}catch(err){
				userdata.user.push({"id": `${message.member.id}`,"roles": []});
				var currentroles = [];
				pos = userdata.user.length-1;
			}
			console.log(pos);
			if (args.length == 0){
				var listroles = "";
				for (var i = 0; i<currentroles.length; i++){
					listroles += currentroles[i]+"\n";
				}
				message.channel.send(`<@${message.member.id}> *** Setup your Roles *** \`\`\`${listroles}\`\`\``);
				return;
			}
			if (args.length == 1){
				args = args[0].split(",");
			}
			var courses = [];
			for(var k=0; k<args.length; k++){		
				var course;
				for (var i=0; i<homework.syn.length; i++){
					for (var j=0; j<homework.syn[j].length; j++){
						if (args[k].toLowerCase() == homework.syn[i][j]){
							course = homework.courses[i];
							console.log(i + " " + j + " homework.syn[i][j]");
							console.log(course);
						}
					}
				}
				if (course != null){
					courses.push(course);
				}
			}
			console.log(courses);
			if (courses.length < 0){
				console.log("course not found");
				message.channel.send("No courses were selected");
				return;
			}
			else {
				for(var j=0; j<courses.length; j++){
					if (currentroles.indexOf(courses[j]) < 0){
						console.log("adding course: " + homework.courses.indexOf(courses[j]));
						userdata.user[pos].roles.push(courses[j]);
						message.guild.members.get(message.member.id).addRole(message.guild.roles.find(role => role.name === homework.roles[homework.courses.indexOf(courses[j])])).catch(console.error);
					} else {
						console.log("removing course: " + homework.courses.indexOf(courses[j]));
						userdata.user[pos].roles.splice(userdata.user[pos].roles.indexOf(courses[j]),1);
						message.guild.members.get(message.member.id).removeRole(message.guild.roles.find(role => role.name === homework.roles[homework.courses.indexOf(courses[j])])).catch(console.error);
					}
				}
			}
			currentroles = userdata.user[pos].roles;
			var listroles = "";
			for (var i = 0; i<currentroles.length; i++){
				listroles += currentroles[i]+"\n";
			}
			message.channel.send(`<@${message.member.id}> *** Roles Changed to *** \`\`\`${listroles}\`\`\``);
			write(userdata, "userdata");  
		}
		
		else if (cmd === 'add') {
			let pos = userdata.user.map(function (test) {return test.id; }).indexOf(message.member.id);
			homework = homedata();
			var homeworkreporttype = "A";
			var name, course, datedue, role;
			// !add homeworkname 111 date
			if (args.length >= 3){
				name = args[0];
				//find course
				var courselower = args[1].toLowerCase();
				if (courselower == "eng"){
					args = args.splice(2,1);
				}
				
				console.log(homework.syn.length);
				for (var i=0; i<homework.syn.length; i++){
					for (var j=0; j<homework.syn[j].length; j++){
						if (courselower == homework.syn[i][j]){
							course = homework.courses[i];
							console.log(i + " " + j + "homework.syn[i][j]");
						}
					}
				}
				
				d = args[2].split("/");
				if (d.length != 3) d = args[2].split("\\");
				if (d.length != 3) d = args[2].split("-");
				console.log(d);
				if (args.length >= 4){
					homeworkreporttype = args[3];
				}
				var datestring = d[2]+"-"+d[1]+"-"+d[0];
				var datebasestring = ('0' + (d[0])).slice(-2)+"-"+('0' + (d[1])).slice(-2)+"-"+d[2];
				var mydate = new Date(datestring);
				console.log(mydate.toDateString());
				
				if(course == null){
					message.channel.send("***Error*** *in Finding Course* - **Please Insure there isn't any space in Assignment Name or Course Name** - *use _ instead of space*");
					return;
				}
				if(String(mydate.toDateString()) == "Invalid Date"|| d.length != 3){
					message.channel.send("***Error*** *in Date Format* - **Please Insure the Date is in the format 01/01/2019 or 01-01-2019**");
					return;
				}
				var hwdate = new Date(d[2]+"-"+d[1]+"-"+d[0]);
				var timedifference = hwdate.getTime()-now.getTime()
				console.log(timedifference);
				if (timedifference < -86400000){
					message.channel.send("***Error*** *Date too old* - **Date cannot be older than Today**");
					return;
				}
				console.log(course);
				console.log(userdata.user[pos].roles.indexOf(course));
				if (userdata.user[pos].roles.indexOf(course) < 0 ){
					message.channel.send("***Error*** *Permissions* - **You need have the correct Role to assign HW for this Course**");
					return;
				}
				var hwpos = homework.list.map(function (test) {return test.name; }).indexOf(name)
				if (hwpos > -1 && homework.list[hwpos].course == course){
					message.channel.send("***Error*** *Duplicated* - **This HW name has already been used in this course**");
					return;
				}
				
				homework.list.push({"name": `${name}`,"course":`${course}`,"datedue":`${datebasestring}`,"role":`${course}`,"report":`${homeworkreporttype}`});
				
				write(homework,"homework");
				
				message.channel.send("***Adding Homework to List***\n"+
									"**Name:** " + name+"\n"+
									"**Course:** " + course+ "\n"+
									"**Date Due:** " + mydate.toDateString()+"\n"+
									"**Report Type:** " + homeworkreporttype);
				return;
			}
			message.channel.send(`!add homework 111 date`);
			return;
		}
		else if (cmd === "rm" || cmd === "remove" || cmd === "del" || cmd === "delete" || cmd === "r"){
			// !rm assignment_name 111
			if (args.length <= 1){
				message.channel.send("***Error*** *Wrong Syntax* - **Please Use** *!rm assignment_name course*");
				return;
			}
			let pos = userdata.user.map(function (test) {return test.id; }).indexOf(message.member.id);
			homework = homedata();
			var course;
			for (var i=0; i<homework.syn.length; i++){
				for (var j=0; j<homework.syn[j].length; j++){
					if (args[1].toLowerCase() == homework.syn[i][j]){
						course = homework.courses[i];
						console.log(i + " " + j + " homework.syn[i][j]");
						console.log(course);
					}
				}
			}
			if(course == null){
				message.channel.send("***Error*** *in Finding Course* - **Please Insure there isn't any space in Assignment Name or Course Name** - *use _ instead of space*");
				return;
			}
			if (userdata.user[pos].roles.indexOf(course) < 0 ){
				message.channel.send("***Error*** *Permissions* - **You need have the correct Role to remove HW for this Course**");
				return;
			}
			var hwpos;
			for (var i=0; i<homework.list.length; i++){
				if (homework.list[i].name == args[0]){
					if (homework.list[i].course == course){
						hwpos = i;
					}
				}
			}
			console.log(hwpos);
			if (hwpos > -1){
				homework.list.splice(i-1,1);
				write(homework,"homework");
				message.channel.send("***Removed Homework from List***\n"+ "**Name:** " + args[0] +"\n**Course:** " + course);
				return;
			}
			message.channel.send("***Error*** *No HW named* **" + args[0] + "** *is found in the course* **" + course+"**");
			return;
		}
		
		else if (cmd === "list" || cmd === "hw" || cmd == "homework"){
			var response;
			if (args.length == 0){
				response = "**List of Homework Due** ```";
				for(var j=0;j<homework.courses.length;j++){
					var hwlist = homework.list.filter(function (el) {return el.course == homework.courses[j]});
					var starter = "";
					console.log(hwlist);
					if (hwlist.length > 0){
						starter = `${homework.courses[j]}` +"\n Name:               DateDue:      ReportType:        \n";
						for(var i=0;i<hwlist.length;i++){
							starter += " "+ space(hwlist[i].name,20) + space(hwlist[i].datedue,14) + hwlist[i].report + "\n";
						}
					}
					if (starter == ""){
						message.channel.send("*There is no task set for* **"+homework.courses[j]+"**");
					}else{
						response += starter;
					}
				}
				
				response += "```";
			}
			else if (args.length == 1){
				response = "```";
				var course = "";
				var starter = "";
				for (var i=0; i<homework.syn.length; i++){
					for (var j=0; j<homework.syn[j].length; j++){
						if (args[0].toLowerCase() == homework.syn[i][j]){
							course = homework.courses[i];
							console.log(i + " " + j + " homework.syn[i][j]");
							console.log(course);
						}
					}
				}
				var hwlist = homework.list.filter(function (el) {return el.course == course });
				if (hwlist.length > 0){
					starter = `${homework.courses[j]}` +"\n Name:               DateDue:      ReportType:        \n";
					for(var i=0;i<hwlist.length;i++){
						starter += " "+ space(hwlist[i].name,20) + space(hwlist[i].datedue,14) + hwlist[i].report + "\n";
					}
				}
				if (starter == ""){
					message.channel.send("*There is no task set for* **"+homework.courses[j]+"**");
					return;
				}
				starter += "```";
				response += starter;
			}
			message.channel.send(response);
			return;
		}

        // Make sure this command always checks for you. YOU NEVER WANT ANYONE ELSE TO USE THIS COMMAND
        else if (cmd === "eval" && message.author.id === config.owner){ // < checks the message author's id to yours in config.json.
            const code = args.join(" ");
            return evalCmd(message, code);
        }

        else { // if the command doesn't match anything you can say something or just ignore it
            message.channel.send(`I don't know what command that is.`);
            return;
        }
        
    } else if (message.content.indexOf("<@"+bot.user.id) === 0 || message.content.indexOf("<@!"+bot.user.id) === 0) { // Catch @Mentions

        return message.channel.send(`Use \`${config.prefix}\` to interact with me.`); //help people learn your prefix
    }
    return;
});

function evalCmd(message, code) {
    if(message.author.id !== config.owner) return;
    try {
        let evaled = eval(code);
        if (typeof evaled !== "string")
            evaled = util.inspect(evaled);
            message.channel.send(clean(evaled), {code:"xl"});
    } catch (err) {
        message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
}
function clean(text) {
    if (typeof(text) !== 'string') {
        text = util.inspect(text, { depth: 0 });
    }
    text = text
        .replace(/`/g, '`' + String.fromCharCode(8203))
        .replace(/@/g, '@' + String.fromCharCode(8203))
        .replace(config.token, 'mfa.VkO_2G4Qv3T--NO--lWetW_tjND--TOKEN--QFTm6YGtzq9PH--4U--tG0') //Don't let it post your token
    return text;
}

function homedata(){
	homework = require('./homework.json');
	return homework;
}

function write(data,name){
	fs.writeFile ("./"+name+".json", JSON.stringify(data, null, 4), function(err) {
		if (err) throw err;
		console.log('complete writing data to '+name);
		}
	);
}

function space(str, numspace)
{
    var emptySpace = "";
	var space = numspace-str.length;
    for (i = 0; i < space; i++){
        emptySpace += " ";
    }
	if (str.length > numspace){
		str.length = numspace;
	}
    var output = str + emptySpace;
    return output;
}


// Catch Errors before they crash the app.
process.on('uncaughtException', (err) => {
    const errorMsg = err.stack.replace(new RegExp(`${__dirname}/`, 'g'), './');
    console.error('Uncaught Exception: ', errorMsg);
    // process.exit(1); //Eh, should be fine, but maybe handle this?
});

process.on('unhandledRejection', err => {
    console.error('Uncaught Promise Error: ', err);
    // process.exit(1); //Eh, should be fine, but maybe handle this?
});

bot.login(config.token);