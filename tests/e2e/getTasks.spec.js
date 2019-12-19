const nock = require('nock');
const axios = require('axios');
const TwilioDriver = require('../drivers/twilio');
const MondayDriver = require('../drivers/monday');
const MessageBuilder = require('../builders/message');

const ACTIONS = require('../../contants/actions');

describe('Get tasks', () => {
  let mondayDriver, twilioDriver;

  beforeEach(() => {
    mondayDriver = new MondayDriver();
    twilioDriver = new TwilioDriver();
  });

  test('Fail if user is not associated', async (done) => {
    const twilioReply = twilioDriver.whenCallingWith('No Monday user is associated with this phone number');
    const message = new MessageBuilder();
    message
      .action(ACTIONS.USER_UNFINISHED_TASKS)
      .from(Math.random().toString());


    await axios.post('http://localhost:3000/messages', message.build());

    setTimeout(() => {
      expect(twilioReply.isDone()).toBe(true);
      done();
    }, 600);
  });

  describe('with associated user', () => {
    const userId = 67890;
    let from;
    beforeEach((done) => {
      from = Math.random().toString();
      mondayDriver.givenReply({
        users: [
          {
            id: userId,
            name: 'Sergey',
            email: 'sergey@test.net'
          }
        ]
      });
      twilioDriver.whenCallingWith('Done');
      const associateEmailMessage = new MessageBuilder();

      associateEmailMessage
        .action(ACTIONS.ASSOCIATE_WITH_EMAIL)
        .body('sergey@test.net')
        .from(from);

      axios.post('http://localhost:3000/messages', associateEmailMessage.build());
      setTimeout(done, 600);
    });

    test('Get user assigned tasks successfully', (done) => {
      const name = 'Item with null status';
      mondayDriver.givenReply({
        boards: [
          {
            items: [
              {
                name,
                'column_values': [
                  {
                    id: 'person',
                    value: JSON.stringify({ id: userId })
                  },
                  {
                    id: 'status',
                    text: null,
                    value: null
                  }
                ]
              }
            ]
          }
        ]
      });

      twilioDriver.whenCallingWith(name);

      const getTasksMessage = new MessageBuilder();

      getTasksMessage
        .action(ACTIONS.USER_UNFINISHED_TASKS)
        .from(from);

      axios.post('http://localhost:3000/messages', getTasksMessage.build());

      setTimeout(() => {
        expect(nock.isDone()).toBe(true);
        done();
      }, 600);
    });

    test('Return tasks from people column', (done) => {
      const name = 'Renew car registration';
      mondayDriver.givenReply({
        boards: [
          {
            items: [
              {
                id: 359646061,
                name,
                'column_values': [
                  {
                    id: "status0",
                    text: null,
                    value: null
                  },
                  {
                    id: "status",
                    text: null,
                    value: null
                  },
                  {
                    id: "date",
                    text: "2019-12-17",
                    value: "{\"date\":\"2019-12-17\",\"changed_at\":\"2019-12-17T10:44:58.692Z\"}"
                  },
                  {
                    id: "people",
                    text: "Sergey Bolshchikov",
                    value: `{\"personsAndTeams\":[{\"id\":${userId},\"kind\":\"person\"}],\"changed_at\":\"2019-12-17T10:47:50.553Z\"}`
                  }
                ]
              }
            ]
          }
        ]
      });

      twilioDriver.whenCallingWith(name);

      const getTasksMessage = new MessageBuilder();

      getTasksMessage
        .action(ACTIONS.USER_UNFINISHED_TASKS)
        .from(from);

      axios.post('http://localhost:3000/messages', getTasksMessage.build());

      setTimeout(() => {
        expect(nock.isDone()).toBe(true);
        done();
      }, 600);
    });
  });


});
