package com.experimentaai.lobby.exception;

/**
 * Exceção lançada quando ocorre um erro ao exibir a janela de status.
 */
public class StatusWindowException extends RuntimeException {

    public StatusWindowException(String message) {
        super(message);
    }

    public StatusWindowException(String message, Throwable cause) {
        super(message, cause);
    }
}
