<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Database\Eloquent\Model;
use Throwable;

class StaleModelException extends Exception
{
    public $model;

    public function __construct(Model $model, $message = "", $code = 0, ?Throwable $previous = null)
    {
        $this->model = $model;

        if ($message === "") {
            $class = class_basename($model);
            $message = "The {$class} has been modified by another user. Please refresh and try again.";
        }

        parent::__construct($message, $code, $previous);
    }
}
