package com.experimentaai.lobby.exception;

/**
 * Exceção lançada quando ocorre um erro ao obter informações do servidor.
 */
public class ServerInfoException extends RuntimeException {

    public ServerInfoException(String message) {
        super(message);
    }

    public ServerInfoException(String message, Throwable cause) {
        super(message, cause);
    }
}
