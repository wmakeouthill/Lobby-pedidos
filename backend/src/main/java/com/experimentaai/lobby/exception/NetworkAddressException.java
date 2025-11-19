package com.experimentaai.lobby.exception;

/**
 * Exceção lançada quando ocorre um erro ao coletar endereços de rede.
 */
public class NetworkAddressException extends RuntimeException {

    public NetworkAddressException(String message) {
        super(message);
    }

    public NetworkAddressException(String message, Throwable cause) {
        super(message, cause);
    }
}
