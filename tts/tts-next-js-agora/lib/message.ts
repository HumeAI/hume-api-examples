import type { IAgoraRTCClient, UID } from 'agora-rtc-react';

const CONSOLE_LOG_PREFIX = '[MessageService]';
const DEFAULT_MESSAGE_CACHE_TIMEOUT = 1000 * 60 * 5; // 5 minutes
const DEFAULT_INTERVAL = 200; // milliseconds

const decodeStreamMessage = ( stream: Uint8Array ) =>
{
  const decoder = new TextDecoder();
  return decoder.decode( stream );
};

type TDataChunk = {
  message_id: string;
  part_idx: number;
  part_sum: number;
  content: string;
};

type TDataChunkMessageV1 = {
  is_final: boolean;
  stream_id: number;
  message_id: string;
  data_type: string;
  text_ts: number;
  text: string;
};

type TDataChunkMessageWord = {
  word: string;
  start_ms: number;
  duration_ms: number;
  stable: boolean;
};

type TQueueItem = {
  turn_id: number;
  text: string;
  words: ( TDataChunkMessageWord & { word_status?: EMessageStatus; } )[];
  status: EMessageStatus;
  stream_id: number;
};

export enum EMessageStatus
{
  IN_PROGRESS = 0,
  END = 1,
  INTERRUPTED = 2,
}

export enum ETranscriptionObjectType
{
  USER_TRANSCRIPTION = 'user.transcription',
  AGENT_TRANSCRIPTION = 'assistant.transcription',
  MSG_INTERRUPTED = 'message.interrupt',
}

export enum EMessageEngineMode
{
  TEXT = 'text',
  WORD = 'word',
  AUTO = 'auto',
}

export interface IMessageListItem
{
  uid: number;
  turn_id: number;
  text: string;
  status: EMessageStatus;
}

interface IMessageArrayItem<T>
{
  uid: number;
  turn_id: number;
  _time: number;
  text: string;
  status: EMessageStatus;
  metadata: T | null;
}

interface ITranscriptionBase
{
  object: ETranscriptionObjectType;
  text: string;
  start_ms: number;
  duration_ms: number;
  language: string;
  turn_id: number;
  stream_id: number;
  user_id: string;
  words: TDataChunkMessageWord[] | null;
}

interface IUserTranscription extends ITranscriptionBase
{
  object: ETranscriptionObjectType.USER_TRANSCRIPTION;
  final: boolean;
}

interface IAgentTranscription extends ITranscriptionBase
{
  object: ETranscriptionObjectType.AGENT_TRANSCRIPTION;
  quiet: boolean;
  turn_seq_id: number;
  turn_status: EMessageStatus;
}

interface IMessageInterrupt
{
  object: ETranscriptionObjectType.MSG_INTERRUPTED;
  message_id: string;
  data_type: 'message';
  turn_id: number;
  start_ms: number;
  send_ts: number;
}

export class MessageEngine
{
  private _messageCache: Record<string, TDataChunk[]> = {};
  private _messageCacheTimeout = DEFAULT_MESSAGE_CACHE_TIMEOUT;
  private _legacyMode = false;
  private _mode: EMessageEngineMode = EMessageEngineMode.AUTO;
  private _queue: TQueueItem[] = [];
  private _interval = DEFAULT_INTERVAL;
  private _intervalRef: NodeJS.Timeout | null = null;
  private _pts = 0;
  private _lastPoppedQueueItem: TQueueItem | null | undefined = null;
  private _isRunning = false;
  private _rtcEngine: IAgoraRTCClient | null = null;

  public messageList: IMessageArrayItem<
    Partial<IUserTranscription | IAgentTranscription>
  >[] = [];
  public onMessageListUpdate:
    | ( ( messageList: IMessageListItem[] ) => void )
    | null = null;

  constructor (
    rtcEngine: IAgoraRTCClient,
    renderMode?: EMessageEngineMode,
    callback?: ( messageList: IMessageListItem[] ) => void
  )
  {
    this._rtcEngine = rtcEngine;
    this._listenRtcEvents();
    this.run( { legacyMode: false } );
    this.setMode( renderMode ?? EMessageEngineMode.AUTO );
    this.onMessageListUpdate = callback ?? null;
  }

  private _listenRtcEvents ()
  {
    if ( !this._rtcEngine ) return;

    this._rtcEngine.on( 'audio-metadata', ( metadata: Uint8Array ) =>
    {
      const pts64 = Number( new DataView( metadata.buffer ).getBigUint64( 0, true ) );
      this.setPts( pts64 );
    } );

    this._rtcEngine.on( 'stream-message', ( _: UID, payload: Uint8Array ) =>
    {
      this.handleStreamMessage( payload );
    } );
  }

  public run ( options?: { legacyMode?: boolean; } )
  {
    this._isRunning = true;
    this._legacyMode = options?.legacyMode ?? false;
  }

  public setupInterval ()
  {
    if ( !this._isRunning )
    {
      console.error( CONSOLE_LOG_PREFIX, 'Message service is not running' );
      return;
    }
    if ( this._intervalRef )
    {
      clearInterval( this._intervalRef );
      this._intervalRef = null;
    }
    this._intervalRef = setInterval(
      this._handleQueue.bind( this ),
      this._interval
    );
  }

  public teardownInterval ()
  {
    if ( this._intervalRef )
    {
      clearInterval( this._intervalRef );
      this._intervalRef = null;
    }
  }

  public setPts ( pts: number )
  {
    if ( this._pts < pts )
    {
      this._pts = pts;
    }
  }

  public handleStreamMessage ( stream: Uint8Array )
  {
    if ( !this._isRunning )
    {
      console.warn( CONSOLE_LOG_PREFIX, 'Message service is not running' );
      return;
    }
    const chunk = this.streamMessage2Chunk( stream );
    if ( this._legacyMode )
    {
      this.handleChunk( chunk, this.handleMessageLegacy.bind( this ) );
      return;
    }
    this.handleChunk<
      IUserTranscription | IAgentTranscription | IMessageInterrupt
    >( chunk, this.handleMessage.bind( this ) );
  }

  public handleMessageLegacy ( message: TDataChunkMessageV1 )
  {
    const isTextValid = message?.text && message.text.trim().length > 0;
    if ( !isTextValid )
    {
      return;
    }
    const lastEndedItem = this.messageList.findLast(
      ( item ) =>
        item.uid === message.stream_id && item.status === EMessageStatus.END
    );
    const lastInProgressItem = this.messageList.findLast(
      ( item ) =>
        item.uid === message.stream_id &&
        item.status === EMessageStatus.IN_PROGRESS
    );
    if ( lastEndedItem )
    {
      if ( lastEndedItem._time >= message.text_ts )
      {
        return;
      } else if ( lastInProgressItem )
      {
        lastInProgressItem._time = message.text_ts;
        lastInProgressItem.text = message.text;
        lastInProgressItem.status = message.is_final
          ? EMessageStatus.END
          : EMessageStatus.IN_PROGRESS;
      } else
      {
        this._appendChatHistory( {
          uid: message.stream_id,
          turn_id: message.text_ts,
          _time: message.text_ts,
          text: message.text,
          status: message.is_final
            ? EMessageStatus.END
            : EMessageStatus.IN_PROGRESS,
          metadata: null,
        } );
      }
    } else if ( lastInProgressItem )
    {
      lastInProgressItem._time = message.text_ts;
      lastInProgressItem.text = message.text;
      lastInProgressItem.status = message.is_final
        ? EMessageStatus.END
        : EMessageStatus.IN_PROGRESS;
    } else
    {
      this._appendChatHistory( {
        uid: message.stream_id,
        turn_id: message.text_ts,
        _time: message.text_ts,
        text: message.text,
        status: message.is_final
          ? EMessageStatus.END
          : EMessageStatus.IN_PROGRESS,
        metadata: null,
      } );
    }
    this.messageList.sort( ( a, b ) => a._time - b._time );
    this._mutateChatHistory();
  }

  public handleMessage (
    message: IUserTranscription | IAgentTranscription | IMessageInterrupt
  )
  {
    const isAgentMessage =
      message.object === ETranscriptionObjectType.AGENT_TRANSCRIPTION;
    const isUserMessage =
      message.object === ETranscriptionObjectType.USER_TRANSCRIPTION;
    const isMessageInterrupt =
      message.object === ETranscriptionObjectType.MSG_INTERRUPTED;

    if ( !isAgentMessage && !isUserMessage && !isMessageInterrupt )
    {
      return;
    }

    if ( isAgentMessage && this._mode === EMessageEngineMode.AUTO )
    {
      if ( !message.words )
      {
        this.setMode( EMessageEngineMode.TEXT );
      } else
      {
        this.setupInterval();
        this.setMode( EMessageEngineMode.WORD );
      }
    }

    if ( isAgentMessage && this._mode === EMessageEngineMode.WORD )
    {
      this.handleWordAgentMessage( message );
      return;
    }

    if ( isAgentMessage && this._mode === EMessageEngineMode.TEXT )
    {
      this.handleTextMessage( message as unknown as IUserTranscription );
      return;
    }

    if ( isUserMessage )
    {
      this.handleTextMessage( message );
      return;
    }

    if ( isMessageInterrupt )
    {
      this.handleMessageInterrupt( message );
    }
  }

  private handleWordAgentMessage ( message: IAgentTranscription )
  {
    if ( !message.words || message.words.length === 0 )
    {
      return;
    }

    if ( message.quiet )
    {
      if ( this._queue.length > 0 )
      {
        const lastQueueItem = this._queue.at( -1 );
        if (
          lastQueueItem &&
          lastQueueItem.turn_id === message.turn_id &&
          lastQueueItem.stream_id === message.stream_id
        )
        {
          lastQueueItem.status = EMessageStatus.INTERRUPTED;
        }
      }
      return;
    }

    this._appendQueue( {
      turn_id: message.turn_id,
      stream_id: message.stream_id,
      text: message.text,
      status: message.turn_status ?? EMessageStatus.END,
      words: message.words.map( ( word ) => ( {
        ...word,
        word_status: message.turn_status ?? EMessageStatus.END,
      } ) ),
    } );
  }

  private handleTextMessage ( message: IUserTranscription )
  {
    const turn_id = message.turn_id;
    const text = message.text || '';
    const stream_id = message.stream_id;
    const turn_status = EMessageStatus.END;

    const targetChatHistoryItem = this.messageList.find(
      ( item ) => item.turn_id === turn_id && item.uid === stream_id
    );
    // if not found, push to messageList
    if ( !targetChatHistoryItem )
    {
      this._appendChatHistory( {
        turn_id,
        uid: stream_id,
        _time: new Date().getTime(),
        text,
        status: turn_status,
        metadata: message,
      } );
    } else
    {
      // if found, update text and status
      targetChatHistoryItem.text = text;
      targetChatHistoryItem.status = turn_status;
      targetChatHistoryItem.metadata = message;
    }
    this._mutateChatHistory();
  }

  private handleMessageInterrupt ( message: IMessageInterrupt )
  {
    const existingItem = this.messageList.findLast(
      ( item ) => item.uid === message.turn_id
    );
    if ( existingItem )
    {
      existingItem.status = EMessageStatus.INTERRUPTED;
      this._mutateChatHistory();
    }
  }

  private _appendQueue ( item: TQueueItem )
  {
    this._queue.push( item );
  }

  private _handleQueue ()
  {
    const item = this._queue.shift();
    if ( !item )
    {
      return;
    }
    const { turn_id, stream_id, text, status } = item;
    this._appendChatHistory( {
      uid: stream_id,
      turn_id,
      _time: this._pts,
      text,
      status,
      metadata: null,
    } );
    this._mutateChatHistory();
    this._lastPoppedQueueItem = item;
  }

  private _appendChatHistory (
    item: IMessageArrayItem<Partial<IUserTranscription | IAgentTranscription>>
  )
  {
    this.messageList.push( item );
    this.messageList.sort( ( a, b ) => a._time - b._time );
  }

  private _mutateChatHistory ()
  {
    if ( !this.onMessageListUpdate )
    {
      return;
    }
    const messages = this.messageList.map<IMessageListItem>( ( item ) => ( {
      uid: item.uid,
      turn_id: item.turn_id,
      text: item.text,
      status: item.status,
    } ) );
    this.onMessageListUpdate( messages );
  }

  public handleChunk<T> (
    chunk: string,
    callback: ( message: T ) => void
  )
  {
    try
    {
      // split chunk by '|'
      const [ msgId, partIdx, partSum, partData ] = chunk.split( '|' );
      // convert to TDataChunk
      const input: TDataChunk = {
        message_id: msgId,
        part_idx: parseInt( partIdx, 10 ),
        part_sum: partSum === '???' ? -1 : parseInt( partSum, 10 ), // -1 means total parts unknown
        content: partData,
      };
      // check if total parts is known, skip if unknown
      if ( input.part_sum === -1 )
      {
        return;
      }

      // check if cached
      // case 1: not cached, create new cache
      if ( !this._messageCache[ input.message_id ] )
      {
        this._messageCache[ input.message_id ] = [];
        // set cache timeout, drop it if incomplete after timeout
        setTimeout( () =>
        {
          if (
            this._messageCache[ input.message_id ] &&
            this._messageCache[ input.message_id ].length < input.part_sum
          )
          {
            delete this._messageCache[ input.message_id ];
          }
        }, this._messageCacheTimeout );
      }
      // case 2: cached, add to cache(and sort by part_idx)
      if (
        !this._messageCache[ input.message_id ]?.find(
          ( item ) => item.part_idx === input.part_idx
        )
      )
      {
        // unique push
        this._messageCache[ input.message_id ].push( input );
      }
      this._messageCache[ input.message_id ].sort(
        ( a, b ) => a.part_idx - b.part_idx
      );

      // check if complete
      if ( this._messageCache[ input.message_id ].length === input.part_sum )
      {
        const message = this._messageCache[ input.message_id ]
          .map( ( chunk ) => chunk.content )
          .join( '' );

        // decode message
        const decodedMessage = JSON.parse( atob( message ) );

        // callback
        callback( decodedMessage );

        // delete cache
        delete this._messageCache[ input.message_id ];
      }

      // end
      return;
    } catch ( error: unknown )
    {
      console.error( CONSOLE_LOG_PREFIX, 'handleChunk error', error );
      return;
    }
  }

  public streamMessage2Chunk ( stream: Uint8Array ): string
  {
    const chunk = decodeStreamMessage( stream );
    return chunk;
  }

  public setMode ( mode: EMessageEngineMode )
  {
    this._mode = mode;
  }

  public cleanup ()
  {
    this.teardownInterval();
    this._isRunning = false;
    this._queue = [];
    this.messageList = [];
  }
}


