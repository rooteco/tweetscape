import * as timeago from 'timeago.js';
import TimeAgoReact from 'timeago-react';
import en_short from 'timeago.js/lib/lang/en_short';

timeago.register('en_short', en_short);

export const TimeAgo = TimeAgoReact;
