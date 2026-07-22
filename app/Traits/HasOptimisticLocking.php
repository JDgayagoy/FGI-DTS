<?php

namespace App\Traits;

use App\Exceptions\StaleModelException;

trait HasOptimisticLocking
{
    /**
     * Boot the trait.
     */
    protected static function bootHasOptimisticLocking()
    {
        static::updating(function ($model) {
            $versionColumn = $model->getOptimisticLockingColumn();
            $model->{$versionColumn} = $model->{$versionColumn} + 1;
        });
    }

    /**
     * Set the keys for a save update query.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function setKeysForSaveQuery($query)
    {
        $query = parent::setKeysForSaveQuery($query);

        $versionColumn = $this->getOptimisticLockingColumn();
        
        // Ensure the model actually exists and we have the original version
        if ($this->exists && array_key_exists($versionColumn, $this->getOriginal())) {
            $query->where($versionColumn, $this->getOriginal($versionColumn));
        }

        return $query;
    }

    /**
     * Perform a model update operation.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return bool
     *
     * @throws \App\Exceptions\StaleModelException
     */
    protected function performUpdate(\Illuminate\Database\Eloquent\Builder $query)
    {
        if ($this->fireModelEvent('updating') === false) {
            return false;
        }

        if ($this->usesTimestamps()) {
            $this->updateTimestamps();
        }

        $dirty = $this->getDirty();

        if (count($dirty) > 0) {
            $affected = $this->setKeysForSaveQuery($query)->update($dirty);

            if ($affected === 0) {
                throw new StaleModelException($this);
            }

            $this->syncChanges();
            $this->fireModelEvent('updated', false);
        }

        return true;
    }

    /**
     * Get the name of the column for optimistic locking.
     *
     * @return string
     */
    public function getOptimisticLockingColumn()
    {
        return 'version';
    }
}
