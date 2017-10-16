/* ------------------------------------------------------------------------------------------
*   LUIS Dialog
*   This file contains a dialog for use with Language Understanding Intelligent Service (LUIS)
*   You can find out more information at https://luis.ai
*
*   To use this dialog:
*   1. Create a model in LUIS
*   2. Update the LUIS_MODEL_URL process variable, through .env or directly, with the URL
*       you obtained from step one
*   3. Update the code below to prompt the user for missing entities
------------------------------------------------------------------------------------------ */

const builder = require('botbuilder');
const githubClient = require('../github-client');

module.exports = {
    id: 'SearchProfile',
    name: 'SearchProfile',
    waterfall: [
        (session, args, next) => {
            console.log(args);
            const query = builder.EntityRecognizer.findEntity(args.intent.entities, 'query');
            if (!query) {
                // No matching entity
                builder.Prompts.text(session, `Who did you want to search for?`);
            } else {
                // the user typed in: search <<name>>
                next({ response: query.entity });
            }
        },
        (session, results, next) => {
            var query = results.response;
            if (!query) {
                session.endDialog('Request cancelled');
            } else {
                githubClient.executeSearch(query, (profiles) => {
                    var totalCount = profiles.total_count;
                    if (totalCount == 0) {
                        session.endDialog('Sorry, no results found.');
                    } else if (totalCount > 10) {
                        session.endDialog('More than 10 results were found. Please provide a more restrictive query.');
                    } else {
                        var usernames = profiles.items.map((item) => { return item.login });
    
                        // TODO: Prompt user with list
                        builder.Prompts.choice(
                            session,
                            `Please choose a user`,
                            usernames,
                            { listStyle: builder.ListStyle.button }
                        )
                    }
                });
            }
        }, (session, results, next) => {
            // TODO: Display final request
            // When you're using choice, the the value is inside of results.response.entity
            // session.endConversation(`You chose ${results.response.entity}`);
    
            session.sendTyping();
    
            githubClient.loadProfile(results.response.entity, (profile) => {
                var card = new builder.HeroCard(session);
    
                card.title(profile.login);
    
                card.images([builder.CardImage.create(session, profile.avatar_url)]);
    
                if (profile.name) card.subtitle(profile.name);
    
                var text = '';
                if (profile.company) text += profile.company + '\n\n';
                if (profile.email) text += profile.email + '\n\n';
                if (profile.bio) text += profile.bio;
                card.text(text);
    
                card.tap(new builder.CardAction.openUrl(session, profile.html_url));
    
                var message = new builder.Message(session).attachments([card]);
                session.endConversation(message);
            });
        }
    ]
};