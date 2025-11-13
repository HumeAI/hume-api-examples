import type { IAgoraRTCClient, UID } from 'agora-rtc-react';

const CONSOLE_LOG_PREFIX = '[MessageService]';
const DEFAULT_MESSAGE_CACHE_TIMEOUT = 1000 * 60 * 5; // 5 minutes

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
  words: null;
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

/**
 * Simplified MessageEngine for TEXT mode only.
 * Handles real-time transcription messages from Agora Conversational AI.
 */
export class MessageEngine
{
  private _messageCache: Record<string, TDataChunk[]> = {};
  private _messageCacheTimeout = DEFAULT_MESSAGE_CACHE_TIMEOUT;
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
    callback?: ( messageList: IMessageListItem[] ) => void
  )
  {
    this._rtcEngine = rtcEngine;
    this._listenRtcEvents();
    this._isRunning = true;
    this.onMessageListUpdate = callback ?? null;
  }

  private _listenRtcEvents ()
  {
    if ( !this._rtcEngine ) return;

    this._rtcEngine.on( 'stream-message', ( _: UID, payload: Uint8Array ) =>
    {
      this.handleStreamMessage( payload );
    } );
  }

  public handleStreamMessage ( stream: Uint8Array )
  {
    if ( !this._isRunning )
    {
      console.warn( CONSOLE_LOG_PREFIX, 'Message service is not running' );
      return;
    }
    const chunk = this.streamMessage2Chunk( stream );
    this.handleChunk<
      IUserTranscription | IAgentTranscription | IMessageInterrupt
    >( chunk, this.handleMessage.bind( this ) );
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

    // Handle text messages (both user and agent)
    if ( isAgentMessage || isUserMessage )
    {
      this.handleTextMessage( message as IUserTranscription );
      return;
    }

    // Handle message interrupts
    if ( isMessageInterrupt )
    {
      this.handleMessageInterrupt( message );
    }
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

  /**
   * Handles chunked messages from Agora.
   * Messages may be split across multiple chunks and need to be reassembled.
   */
  public handleChunk<T> (
    chunk: string,
    callback: ( message: T ) => void
  )
  {
    try
    {
      // Split chunk by '|' - format: message_id|part_idx|part_sum|base64_content
      const [ msgId, partIdx, partSum, partData ] = chunk.split( '|' );
      const input: TDataChunk = {
        message_id: msgId,
        part_idx: parseInt( partIdx, 10 ),
        part_sum: partSum === '???' ? -1 : parseInt( partSum, 10 ),
        content: partData,
      };

      // Skip if total parts unknown
      if ( input.part_sum === -1 )
      {
        return;
      }

      // Initialize cache if needed
      if ( !this._messageCache[ input.message_id ] )
      {
        this._messageCache[ input.message_id ] = [];
        // Set cache timeout
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

      // Add chunk to cache if not already present
      if (
        !this._messageCache[ input.message_id ]?.find(
          ( item ) => item.part_idx === input.part_idx
        )
      )
      {
        this._messageCache[ input.message_id ].push( input );
      }

      // Sort chunks by part index
      this._messageCache[ input.message_id ].sort(
        ( a, b ) => a.part_idx - b.part_idx
      );

      // If all parts received, decode and process
      if ( this._messageCache[ input.message_id ].length === input.part_sum )
      {
        const message = this._messageCache[ input.message_id ]
          .map( ( chunk ) => chunk.content )
          .join( '' );

        const decodedMessage = JSON.parse( atob( message ) );
        callback( decodedMessage );

        delete this._messageCache[ input.message_id ];
      }
    } catch ( error: unknown )
    {
      console.error( CONSOLE_LOG_PREFIX, 'handleChunk error', error );
    }
  }

  public streamMessage2Chunk ( stream: Uint8Array ): string
  {
    return decodeStreamMessage( stream );
  }

  public cleanup ()
  {
    this._isRunning = false;
    this._messageCache = {};
    this.messageList = [];
  }
}
