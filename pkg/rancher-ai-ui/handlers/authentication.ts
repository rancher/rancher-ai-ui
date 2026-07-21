import { markRaw } from 'vue';
import { McpAuthenticationRequest } from '../types';

const OAUTH2_CHANNEL_NAME = 'oauth_channel';
const OAUTH2_SUCCESS_MESSAGE = 'oauth_success';

/**
 * Handles OAuth2 authentication requests.
 */
class OAuth2AuthenticationRequest {
  private window: Window | null;
  private broadcastChannel: BroadcastChannel | null = null;
  private clearCloseInterval: NodeJS.Timeout | null = null; // eslint-disable-line no-undef

  private isCompleted: boolean = false;

  private resolveFn: () => void;
  private cancelFn: () => void;

  constructor(metadata: McpAuthenticationRequest, resolveFn: () => void, cancelFn: () => void) {
    this.resolveFn = resolveFn;
    this.cancelFn = cancelFn;

    const authWindow = window.open(metadata.url, `auth_${ metadata.type }`, 'width=600,height=700,left=200,top=200');

    if (authWindow) {
      const channel = new BroadcastChannel(OAUTH2_CHANNEL_NAME);

      channel.onmessage = (event) => {
        if (event.data && event.data.type === OAUTH2_SUCCESS_MESSAGE) {
          this.isCompleted = true;
          this.resolveFn();

          channel.close();
        }
      };

      channel.onmessageerror = () => {
        this.cancelFn();

        channel.close();
      };

      this.broadcastChannel = channel;
    } else {
      this.cancelFn();
    }

    this.clearCloseInterval = setInterval(() => {
      if (!authWindow || authWindow.closed) {
        if (this.clearCloseInterval) {
          clearInterval(this.clearCloseInterval);

          this.clearCloseInterval = null;
        }

        if (!this.isCompleted) {
          this.cancelFn();
        }
      }
    }, 500);

    this.window = authWindow;
  }

  public abort(args = { notify: true }): void {
    if (this.clearCloseInterval) {
      clearInterval(this.clearCloseInterval);

      if (args?.notify) {
        this.cancelFn();
      }
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }

    if (this.window && !this.window.closed) {
      this.window.close();
    }
  }
}

/**
 * Handles authentication requests
 *
 * - Manages the state of active OAuth2 requests.
 * - Other authentication methods can be added in the future.
 */
class AuthenticationHandler {
  private activeOauth2Request: OAuth2AuthenticationRequest | null = null;

  /**
   *
   * @param metadata the metdata payload for the popup window
   * @param resolveFn the method to call to proceed with authentication
   * @param cancelFn  the method to call to cancel the authentication
   *
   * @returns an instance of OAuth2AuthenticationRequest
   *
   * This method creates a new OAuth2 authentication request.
   * If there's an existing active request, it aborts it before creating a new one.
   */
  createOauth2AuthenticationRequest(
    metadata: McpAuthenticationRequest,
    resolveFn: () => void,
    cancelFn: () => void
  ): OAuth2AuthenticationRequest {
    if (this.activeOauth2Request) {
      this.activeOauth2Request.abort({ notify: false });
    }

    this.activeOauth2Request = markRaw(new OAuth2AuthenticationRequest(metadata, resolveFn, cancelFn));

    return this.activeOauth2Request;
  }

  /**
   * Other authentication methods can be added here in the future, following a similar pattern to the OAuth2 method above.
   */

  /**
   * Aborts any pending authentication requests.
   * As of now, it only handles OAuth2 requests, but this can be extended in the future to handle other authentication methods.
   */
  abortPendingRequests(): void {
    if (this.activeOauth2Request) {
      this.activeOauth2Request.abort();
    }

    this.activeOauth2Request = null;
  }
}

export default new AuthenticationHandler();
