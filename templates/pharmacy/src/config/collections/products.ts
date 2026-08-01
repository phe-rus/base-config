import type { CollectionConfig } from '@baseconfig/core/collections/types'
import { defineCollection } from '@baseconfig/core'

export const products: CollectionConfig = defineCollection({
    slug: 'products',
    tabs: [
        {
            tab: 'product',
            label: 'product',
            fields: [
                {
                    name: 'quantity',
                    type: 'number',
                    label: 'Quantity'
                },
                {
                    name: 'price',
                    type: 'number',
                    label: 'Price'
                },
                {
                    name: 'stock',
                    type: 'number',
                    label: 'Stock',
                    defaultValue: 0
                },
                {
                    name: 'description',
                    type: 'richtext',
                    label: 'Description'
                },
            ]
        },
        {
            tab: 'metadata',
            label: 'Metadata',
            fields: [
                {
                    name: 'metaTitle',
                    type: 'meta'
                },
            ]
        }
    ]
})
